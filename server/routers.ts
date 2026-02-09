import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { verifyCredentials } from "./customAuth";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { getDb, getAllMenuCategories, getMenuItemsByCategory, getFeaturedMenuItems, getChefSpecialItems, getMenuItemById, getAllSmsTemplates, getSmsTemplateById, getAllOpeningHours, getOpeningHoursByDay, getAllAboutContent, getAllAboutValues, getAllTeamMembers, getAllAwards, getLegalPageByType, getAllLegalPages } from "./db";
import { orders as ordersTable, orders, orderItems as orderItemsTable, orderItems, menuItems, menuCategories, reservations, eventInquiries, siteSettings, deliveryAreas, subscribers, emailCampaigns, smsTemplates, openingHours, menuItemReviews, galleryImages, blogPosts, aboutContent, aboutValues, teamMembers, awards, legalPages, testimonials, users } from '../drizzle/schema';
import { eq, sql, desc, and } from "drizzle-orm";
import { stripe } from "./stripe";
import { sendOrderStatusUpdateEmail, getResendClient, FROM_EMAIL, sendNewsletterConfirmationEmail, sendCampaignEmail } from "./email";
import { sendOrderReadyForPickupSMS, sendOrderOutForDeliverySMS, sendOrderStatusSMS, formatPhoneNumberE164 } from "./services/sms.service";
import { storagePut, storageGet } from "./storage";
import { optimizeAndUploadImage } from "./imageOptimization";
import { adminUserManagementRouter } from "./adminUserManagement";
import { customRolesRouter } from "./customRoles";
import { analyticsRouter } from "./routers/analytics";
import { auditLogsRouter } from "./routers/auditLogs";
import { passwordResetRouter } from "./passwordReset";
import { logAuditAction, getIpAddress, createChangesObject } from "./services/audit.service";

export const appRouter = router({
  system: systemRouter,
  analytics: analyticsRouter,
  auditLogs: auditLogsRouter,
  passwordReset: passwordResetRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        rememberMe: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await verifyCredentials(input.email, input.password);
        
        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Allow all roles to login - navigation will be filtered based on permissions
        // No role restriction needed here

        // Create session token with appropriate expiry
        const expiresInMs = input.rememberMe 
          ? 30 * 24 * 60 * 60 * 1000  // 30 days if remember me is checked
          : 24 * 60 * 60 * 1000;       // 1 day if not checked
        
        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({
        oldPassword: z.string().min(1, 'Old password is required'),
        newPassword: z.string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number'),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Verify old password
        const user = await verifyCredentials(ctx.user.email!, input.oldPassword);
        if (!user) {
          throw new Error('Current password is incorrect');
        }

        // Hash new password
        const { createPasswordHash } = await import('./customAuth');
        const hashedPassword = await createPasswordHash(input.newPassword);

        // Update password in database
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, ctx.user.id));

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'password_changed',
          entityType: 'user',
          entityId: ctx.user.id.toString(),
          ipAddress: getIpAddress(ctx.req as any),
          userAgent: ctx.req.headers['user-agent'] || undefined,
        });

        return {
          success: true,
          message: 'Password changed successfully',
        };
      }),
  }),

  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ 
        email: z.string().email(), 
        name: z.string().optional(),
        phone: z.string().optional(),
        source: z.enum(["homepage", "checkout", "admin"]).default("homepage"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if email already exists
        const existing = await db.select().from(subscribers).where(eq(subscribers.email, input.email)).limit(1);
        
        if (existing.length > 0) {
          // If already subscribed and active, throw error
          if (existing[0].isActive) {
            throw new Error('This email is already subscribed to our newsletter');
          }
          
          // If previously unsubscribed, reactivate
          await db.update(subscribers)
            .set({ 
              isActive: true, 
              subscribedAt: new Date(),
              unsubscribedAt: null,
              name: input.name || existing[0].name,
              source: input.source,
            })
            .where(eq(subscribers.id, existing[0].id));
        } else {
          // New subscriber
          await db.insert(subscribers).values({
            email: input.email,
            name: input.name || null,
            source: input.source,
          });
        }

        // Send confirmation email
        await sendNewsletterConfirmationEmail(input.email, input.name || 'Valued Customer');
        
        // Send SMS confirmation if phone provided
        if (input.phone) {
          try {
            const { sendNewsletterConfirmationSMS } = await import('./services/sms.service');
            await sendNewsletterConfirmationSMS(
              input.name || 'Valued Customer',
              input.phone,
              input.email
            );
          } catch (smsError: any) {
            console.error('[Newsletter] Failed to send SMS confirmation:', smsError.message);
            // Don't fail the subscription if SMS fails
          }
        }

        return { success: true, message: 'Successfully subscribed' };
      }),
  }),

  settings: router({
    getPublic: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const settings = await db.select().from(siteSettings);
      
      // Convert to key-value object for easier access
      const settingsMap: Record<string, string> = {};
      settings.forEach((setting) => {
        settingsMap[setting.settingKey] = setting.settingValue;
      });
      
      return settingsMap;
    }),
    getPublicOpeningHours: publicProcedure.query(async () => {
      return await getAllOpeningHours();
    }),
  }),

  menu: router({
    categories: publicProcedure.query(async () => {
      return await getAllMenuCategories();
    }),
    items: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getMenuItemsByCategory(input?.categoryId);
      }),
    featured: publicProcedure.query(async () => {
      return await getFeaturedMenuItems();
    }),
    chefSpecials: publicProcedure.query(async () => {
      return await getChefSpecialItems();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getMenuItemById(input.id);
      }),
  }),

  orders: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        orderType: z.enum(['delivery', 'pickup']),
        deliveryAddress: z.string().optional(),
        deliveryPostcode: z.string().optional(),
        specialInstructions: z.string().optional(),
        preferredTime: z.string().optional(),
        smsOptIn: z.boolean().optional().default(true), // Customer SMS notification preference (GDPR)
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number(),
          price: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if restaurant is currently open (using UK/GMT timezone)
        // Get current time in Europe/London timezone
        const now = new Date();
        const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
        const currentTime = `${ukTime.getHours().toString().padStart(2, '0')}:${ukTime.getMinutes().toString().padStart(2, '0')}`;
        const currentDayOfWeek = ukTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get today's opening hours from database
        const todayHours = await getOpeningHoursByDay(currentDayOfWeek);
        
        if (!todayHours) {
          throw new Error('Unable to verify opening hours. Please try again later.');
        }
        
        // Helper function to convert 24-hour time to 12-hour format with AM/PM
        const formatTime12Hour = (time24: string): string => {
          const [hours, minutes] = time24.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12;
          return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
        };
        
        // Check if restaurant is closed today
        if (todayHours.isClosed) {
          throw new Error('Sorry, we are closed today. Please check our opening hours and try again.');
        }
        
        // Check if current time is within opening hours
        if (currentTime < todayHours.openTime || currentTime >= todayHours.closeTime) {
          throw new Error(`Sorry, we are currently closed. Our opening hours today are ${formatTime12Hour(todayHours.openTime)} - ${formatTime12Hour(todayHours.closeTime)}.`);
        }

        const { items: orderItems, preferredTime, ...orderData } = input;
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = input.orderType === 'delivery' ? 3.99 : 0;
        const total = subtotal + deliveryFee;
        const orderNumber = `BO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Convert preferred time (HH:MM) to timestamp for today in UK timezone
        // The frontend sends time in HH:MM format (e.g., "15:45")
        // We need to create a Date object representing that time in UK timezone
        let scheduledFor = null;
        if (preferredTime) {
          const [hours, minutes] = preferredTime.split(':').map(Number);
          // Get current date components in UK timezone
          const ukYear = ukTime.getFullYear();
          const ukMonth = ukTime.getMonth();
          const ukDate = ukTime.getDate();
          // Create date with UK timezone components
          const scheduledDate = new Date(ukYear, ukMonth, ukDate, hours, minutes, 0, 0);
          scheduledFor = scheduledDate;
        }

        const [result] = await db.insert(orders).values({
          orderNumber,
          ...orderData,
          scheduledFor,
          subtotal: subtotal.toString(),
          deliveryFee: deliveryFee.toString(),
          total: total.toString(),
          status: 'pending',
          paymentStatus: 'pending',
        });

        const orderId = result.insertId;

        for (const item of orderItems) {
          const menuItemResult = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId)).limit(1);
          if (menuItemResult.length > 0) {
            await db.insert(orderItemsTable).values({
              orderId,
              menuItemId: item.menuItemId,
              menuItemName: menuItemResult[0].name,
              quantity: item.quantity,
              price: item.price.toString(),
              subtotal: (item.price * item.quantity).toString(),
            });
          }
        }

        return { orderNumber, orderId };
      }),
  }),

  reservations: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        partySize: z.number(),
        reservationDate: z.date(),
        specialRequests: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const reservationTime = input.reservationDate.toTimeString().substring(0, 5);

        await db.insert(reservations).values({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          partySize: input.partySize,
          reservationDate: input.reservationDate,
          reservationTime,
          specialRequests: input.specialRequests || null,
        });

        // Send email notifications
        try {
          const { sendReservationConfirmationEmail, sendAdminReservationNotification } = await import('./email');
          
          const emailData = {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            date: input.reservationDate,
            time: reservationTime,
            guests: input.partySize,
            specialRequests: input.specialRequests,
          };

          // Send customer confirmation
          await sendReservationConfirmationEmail(emailData);

          // Send admin notification
          await sendAdminReservationNotification(emailData);
        } catch (emailError: any) {
          console.error('[Reservation] Failed to send email notifications:', emailError.message);
          // Don't fail the reservation if email fails
        }

        // Send admin SMS notification
        try {
          const { sendAdminNewReservationSMS } = await import('./services/sms.service');
          
          // Get admin phone from site settings
          const phoneSettings = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'contact_phone'));
          const adminPhone = phoneSettings[0]?.settingValue;
          
          if (adminPhone) {
            await sendAdminNewReservationSMS(
              adminPhone,
              input.customerName,
              input.partySize,
              input.reservationDate.toLocaleDateString('en-GB'),
              reservationTime
            );
          }
        } catch (smsError: any) {
          console.error('[Reservation] Failed to send admin SMS notification:', smsError.message);
          // Don't fail the reservation if SMS fails
        }

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { desc } = await import('drizzle-orm');

        let query = db.select().from(reservations);

        if (input?.status) {
          query = query.where(eq(reservations.status, input.status)) as any;
        }

        const results = await query
          .orderBy(desc(reservations.reservationDate))
          .limit(input?.limit || 50);

        return results;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get reservation details for notifications
        const [reservation] = await db.select().from(reservations).where(eq(reservations.id, input.id));
        if (!reservation) {
          throw new Error('Reservation not found');
        }

        // Update status
        await db.update(reservations)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(reservations.id, input.id));

        // Send email notification for status change
        try {
          const { sendReservationStatusEmail } = await import('./email');
          await sendReservationStatusEmail({
            customerName: reservation.customerName,
            customerEmail: reservation.customerEmail,
            date: reservation.reservationDate,
            time: reservation.reservationTime,
            guests: reservation.partySize,
            status: input.status,
          });
        } catch (emailError: any) {
          console.error('[Reservation] Failed to send status email:', emailError.message);
        }

        // Send SMS notification for status change
        try {
          const { sendReservationStatusSMS } = await import('./services/sms.service');
          const { formatPhoneNumberE164 } = await import('./services/sms.service');
          const formattedPhone = formatPhoneNumberE164(reservation.customerPhone);
          
          await sendReservationStatusSMS(
            reservation.customerName,
            formattedPhone,
            reservation.reservationDate,
            reservation.reservationTime,
            input.status
          );
        } catch (smsError: any) {
          console.error('[Reservation] Failed to send status SMS:', smsError.message);
        }

        return { success: true };
      }),
  }),

  admin: router({
    uploadImage: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 encoded image
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {        const { storagePut } = await import('./storage');
        
        // Convert base64 to buffer
        const base64Data = input.file.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `menu-items/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return { url, fileKey };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const menuItemsResult = await db.select().from(menuItems);
      const ordersResult = await db.select().from(orders).where(eq(orders.status, 'pending'));
      const reservationsResult = await db.select().from(reservations).where(eq(reservations.status, 'pending'));
      const completedOrders = await db.select().from(orders).where(eq(orders.status, 'completed'));

      const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);

      return {
        menuItemsCount: menuItemsResult.length,
        pendingOrdersCount: ordersResult.length,
        pendingReservationsCount: reservationsResult.length,
        totalRevenue: totalRevenue.toFixed(2),
      };
    }),

    todaySnapshot: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      // Today's paid orders
      const todayOrders = await db.select().from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          sql`${orders.createdAt} >= ${todayStart.toISOString()}`
        ));

      // Yesterday's paid orders
      const yesterdayOrders = await db.select().from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          sql`${orders.createdAt} >= ${yesterdayStart.toISOString()} AND ${orders.createdAt} < ${todayStart.toISOString()}`
        ));

      // Today's reservations
      const todayReservations = await db.select().from(reservations)
        .where(sql`${reservations.reservationDate} >= ${todayStart.toISOString()}`);

      // Yesterday's reservations
      const yesterdayReservations = await db.select().from(reservations)
        .where(sql`${reservations.reservationDate} >= ${yesterdayStart.toISOString()} AND ${reservations.reservationDate} < ${todayStart.toISOString()}`);

      const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);

      // Calculate percentage changes
      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : todayRevenue > 0 ? '100' : '0';
      
      const ordersChange = yesterdayOrders.length > 0
        ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(1)
        : todayOrders.length > 0 ? '100' : '0';

      const reservationsChange = yesterdayReservations.length > 0
        ? ((todayReservations.length - yesterdayReservations.length) / yesterdayReservations.length * 100).toFixed(1)
        : todayReservations.length > 0 ? '100' : '0';

      // Upcoming reservations (next 2 hours)
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const upcomingReservations = await db.select().from(reservations)
        .where(and(
          sql`${reservations.reservationDate} >= ${now.toISOString()}`,
          sql`${reservations.reservationDate} <= ${twoHoursFromNow.toISOString()}`,
          eq(reservations.status, 'confirmed')
        ))
        .limit(5);

      return {
        today: {
          revenue: todayRevenue.toFixed(2),
          orders: todayOrders.length,
          reservations: todayReservations.length,
        },
        yesterday: {
          revenue: yesterdayRevenue.toFixed(2),
          orders: yesterdayOrders.length,
          reservations: yesterdayReservations.length,
        },
        changes: {
          revenue: revenueChange,
          orders: ordersChange,
          reservations: reservationsChange,
        },
        upcomingReservations: upcomingReservations.map(r => ({
          id: r.id,
          customerName: r.customerName,
          partySize: r.partySize,
          reservationDate: r.reservationDate,
        })),
      };
    }),

    alerts: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Import testimonials table
      const { testimonials } = await import('../drizzle/schema');

      // Pending testimonials
      const pendingTestimonials = await db.select().from(testimonials)
        .where(eq(testimonials.isApproved, false));

      // Unconfirmed reservations from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const unconfirmedReservations = await db.select().from(reservations)
        .where(and(
          eq(reservations.status, 'pending'),
          sql`${reservations.createdAt} >= ${yesterday.toISOString()}`
        ));

      return {
        pendingTestimonials: pendingTestimonials.length,
        unconfirmedReservations: unconfirmedReservations.length,
      };
    }),

    recentActivity: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { testimonials } = await import('../drizzle/schema');

      // Get recent orders (last 10)
      const recentOrders = await db.select({
        id: orders.id,
        type: sql<string>`'order'`,
        description: sql<string>`CONCAT('New order #', ${orders.id})`,
        createdAt: orders.createdAt,
      }).from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      // Get recent reservations (last 5)
      const recentReservations = await db.select({
        id: reservations.id,
        type: sql<string>`'reservation'`,
        description: sql<string>`CONCAT('Reservation for ', ${reservations.customerName})`,
        createdAt: reservations.createdAt,
      }).from(reservations)
        .orderBy(desc(reservations.createdAt))
        .limit(5);

      // Get recent testimonials (last 5)
      const recentTestimonials = await db.select({
        id: testimonials.id,
        type: sql<string>`'testimonial'`,
        description: sql<string>`CONCAT('Testimonial from ', ${testimonials.customerName})`,
        createdAt: testimonials.createdAt,
      }).from(testimonials)
        .orderBy(desc(testimonials.createdAt))
        .limit(5);

      // Combine and sort all activities
      const allActivities = [...recentOrders, ...recentReservations, ...recentTestimonials]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return allActivities;
    }),

    statsWithTrends: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Current week stats
      const thisWeekOrders = await db.select().from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          sql`${orders.createdAt} >= ${weekAgo.toISOString()}`
        ));

      // Previous week stats
      const lastWeekOrders = await db.select().from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          sql`${orders.createdAt} >= ${twoWeeksAgo.toISOString()} AND ${orders.createdAt} < ${weekAgo.toISOString()}`
        ));

      const thisWeekRevenue = thisWeekOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);

      // Calculate trends
      const revenueTrend = lastWeekRevenue > 0
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1)
        : thisWeekRevenue > 0 ? '100' : '0';

      const ordersTrend = lastWeekOrders.length > 0
        ? ((thisWeekOrders.length - lastWeekOrders.length) / lastWeekOrders.length * 100).toFixed(1)
        : thisWeekOrders.length > 0 ? '100' : '0';

      // Current counts
      const menuItemsResult = await db.select().from(menuItems);
      const pendingOrdersResult = await db.select().from(orders).where(eq(orders.status, 'pending'));
      const pendingReservationsResult = await db.select().from(reservations).where(eq(reservations.status, 'pending'));
      const completedOrders = await db.select().from(orders).where(eq(orders.status, 'completed'));
      const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);

      return {
        menuItemsCount: menuItemsResult.length,
        pendingOrdersCount: pendingOrdersResult.length,
        pendingReservationsCount: pendingReservationsResult.length,
        totalRevenue: totalRevenue.toFixed(2),
        trends: {
          revenue: revenueTrend,
          orders: ordersTrend,
        },
      };
    }),

    customerInsights: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get paid orders in date range
        const paidOrders = await db.select().from(orders)
          .where(and(
            eq(orders.paymentStatus, 'paid'),
            sql`${orders.createdAt} >= ${input.startDate}`,
            sql`${orders.createdAt} <= ${input.endDate}`
          ));

        // Calculate unique customers
        const uniqueCustomers = new Set(paidOrders.map(o => o.customerEmail?.toLowerCase()).filter(Boolean));

        // Calculate repeat customers
        const customerOrderCounts: Record<string, number> = {};
        paidOrders.forEach(order => {
          const email = order.customerEmail?.toLowerCase();
          if (email) {
            customerOrderCounts[email] = (customerOrderCounts[email] || 0) + 1;
          }
        });

        const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;
        const repeatRate = uniqueCustomers.size > 0 
          ? (repeatCustomers / uniqueCustomers.size * 100).toFixed(1)
          : '0';

        // Calculate total revenue and average customer lifetime value
        const totalRevenue = paidOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
        const avgLifetimeValue = uniqueCustomers.size > 0
          ? (totalRevenue / uniqueCustomers.size).toFixed(2)
          : '0.00';

        // Top 10 customers by total spend
        const customerSpending: Record<string, { email: string; name: string; total: number; orders: number }> = {};
        paidOrders.forEach(order => {
          const email = order.customerEmail?.toLowerCase();
          if (email) {
            if (!customerSpending[email]) {
              customerSpending[email] = {
                email: order.customerEmail || '',
                name: order.customerName || 'Unknown',
                total: 0,
                orders: 0,
              };
            }
            customerSpending[email].total += parseFloat(order.total);
            customerSpending[email].orders += 1;
          }
        });

        const topCustomers = Object.values(customerSpending)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
          .map(c => ({
            ...c,
            total: c.total.toFixed(2),
          }));

        // New vs returning customer ratio
        const newCustomers = uniqueCustomers.size - repeatCustomers;

        return {
          totalCustomers: uniqueCustomers.size,
          repeatCustomers,
          repeatRate,
          avgLifetimeValue,
          topCustomers,
          newCustomers,
          totalOrders: paidOrders.length,
          totalRevenue: totalRevenue.toFixed(2),
        };
      }),

    menuPerformance: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get paid orders in date range
        const paidOrders = await db.select().from(orders)
          .where(and(
            eq(orders.paymentStatus, 'paid'),
            sql`${orders.createdAt} >= ${input.startDate}`,
            sql`${orders.createdAt} <= ${input.endDate}`
          ));

        // Import orderItems table
        const { orderItems: orderItemsTable } = await import('../drizzle/schema');

        // Get all menu items with categories
        const allMenuItems = await db.select({
          id: menuItems.id,
          name: menuItems.name,
          price: menuItems.price,
          categoryId: menuItems.categoryId,
          categoryName: menuCategories.name,
        })
        .from(menuItems)
        .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id));

        // Get order items for these orders
        const orderIds = paidOrders.map(o => o.id);
        const orderItemsData = orderIds.length > 0
          ? await db.select().from(orderItemsTable)
              .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`)
          : [];

        // Calculate item performance
        const itemStats: Record<number, { name: string; category: string; quantity: number; revenue: number }> = {};
        
        orderItemsData.forEach(item => {
          const menuItem = allMenuItems.find(mi => mi.id === item.menuItemId);
          if (menuItem) {
            if (!itemStats[item.menuItemId]) {
              itemStats[item.menuItemId] = {
                name: menuItem.name,
                category: menuItem.categoryName || 'Uncategorized',
                quantity: 0,
                revenue: 0,
              };
            }
            itemStats[item.menuItemId].quantity += item.quantity;
            itemStats[item.menuItemId].revenue += parseFloat(item.price.toString()) * item.quantity;
          }
        });

        // Calculate category revenue
        const categoryRevenue: Record<string, number> = {};
        Object.values(itemStats).forEach(item => {
          categoryRevenue[item.category] = (categoryRevenue[item.category] || 0) + item.revenue;
        });

        const categoryData = Object.entries(categoryRevenue)
          .map(([name, revenue]) => ({
            name,
            revenue: parseFloat(revenue.toFixed(2)),
          }))
          .sort((a, b) => b.revenue - a.revenue);

        // Top 10 items by revenue
        const topItems = Object.entries(itemStats)
          .map(([id, data]) => ({
            id: parseInt(id),
            ...data,
            revenue: parseFloat(data.revenue.toFixed(2)),
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Bottom 10 items by revenue (that were ordered at least once)
        const bottomItems = Object.entries(itemStats)
          .map(([id, data]) => ({
            id: parseInt(id),
            ...data,
            revenue: parseFloat(data.revenue.toFixed(2)),
          }))
          .sort((a, b) => a.revenue - b.revenue)
          .slice(0, 10);

        // Items never ordered
        const orderedItemIds = new Set(Object.keys(itemStats).map(Number));
        const neverOrdered = allMenuItems
          .filter(item => !orderedItemIds.has(item.id))
          .map(item => ({
            id: item.id,
            name: item.name,
            category: item.categoryName || 'Uncategorized',
          }))
          .slice(0, 20);

        // Average items per order
        const totalItems = orderItemsData.reduce((sum, item) => sum + item.quantity, 0);
        const avgItemsPerOrder = paidOrders.length > 0
          ? (totalItems / paidOrders.length).toFixed(1)
          : '0';

        return {
          categoryRevenue: categoryData,
          topItems,
          bottomItems,
          neverOrdered,
          avgItemsPerOrder,
          totalItemsSold: totalItems,
        };
      }),

    reservationAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get reservations in date range
        const reservationsData = await db.select().from(reservations)
          .where(and(
            sql`DATE(${reservations.reservationDate}) >= ${input.startDate}`,
            sql`DATE(${reservations.reservationDate}) <= ${input.endDate}`
          ));

        // Busiest days of week (0 = Sunday, 6 = Saturday)
        const dayStats: Record<number, number> = {};
        reservationsData.forEach(res => {
          const day = new Date(res.reservationDate).getDay();
          dayStats[day] = (dayStats[day] || 0) + 1;
        });

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const busiestDays = dayNames.map((name, index) => ({
          day: name,
          count: dayStats[index] || 0,
        }));

        // Average party size
        const totalGuests = reservationsData.reduce((sum, res) => sum + res.partySize, 0);
        const avgPartySize = reservationsData.length > 0
          ? (totalGuests / reservationsData.length).toFixed(1)
          : '0';

        // Status breakdown
        const statusBreakdown = {
          confirmed: reservationsData.filter(r => r.status === 'confirmed').length,
          pending: reservationsData.filter(r => r.status === 'pending').length,
          cancelled: reservationsData.filter(r => r.status === 'cancelled').length,
          completed: reservationsData.filter(r => r.status === 'completed').length,
        };

        // Peak booking times (hour of day)
        const hourStats: Record<number, number> = {};
        reservationsData.forEach(res => {
          const hour = new Date(res.reservationDate).getHours();
          hourStats[hour] = (hourStats[hour] || 0) + 1;
        });

        const peakTimes = Object.entries(hourStats)
          .map(([hour, count]) => ({
            hour: `${hour}:00`,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Cancellation rate
        const cancelledCount = statusBreakdown.cancelled;
        const totalReservations = reservationsData.length;
        const cancellationRate = totalReservations > 0
          ? ((cancelledCount / totalReservations) * 100).toFixed(1)
          : '0';

        return {
          busiestDays,
          avgPartySize,
          statusBreakdown,
          peakTimes,
          cancellationRate,
          totalReservations,
        };
      }),

    eventCateringAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get event inquiries in date range
        const inquiriesData = await db.select().from(eventInquiries)
          .where(and(
            sql`DATE(${eventInquiries.createdAt}) >= ${input.startDate}`,
            sql`DATE(${eventInquiries.createdAt}) <= ${input.endDate}`
          ));

        // Status breakdown
        const statusBreakdown = {
          new: inquiriesData.filter(i => i.status === 'new').length,
          contacted: inquiriesData.filter(i => i.status === 'contacted').length,
          quoted: inquiriesData.filter(i => i.status === 'quoted').length,
          booked: inquiriesData.filter(i => i.status === 'booked').length,
          cancelled: inquiriesData.filter(i => i.status === 'cancelled').length,
        };

        // Event types distribution
        const eventTypeStats: Record<string, number> = {};
        inquiriesData.forEach(inquiry => {
          eventTypeStats[inquiry.eventType] = (eventTypeStats[inquiry.eventType] || 0) + 1;
        });

        const eventTypes = Object.entries(eventTypeStats)
          .map(([type, count]) => ({
            type,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        // Average guest count
        const totalGuests = inquiriesData.reduce((sum, i) => sum + (i.guestCount || 0), 0);
        const avgGuestCount = inquiriesData.length > 0
          ? (totalGuests / inquiriesData.length).toFixed(0)
          : '0';

        // Conversion rate (booked / total)
        const bookedCount = statusBreakdown.booked;
        const totalInquiries = inquiriesData.length;
        const conversionRate = totalInquiries > 0
          ? ((bookedCount / totalInquiries) * 100).toFixed(1)
          : '0';

        // Monthly trend (group by month)
        const monthlyStats: Record<string, number> = {};
        inquiriesData.forEach(inquiry => {
          const month = new Date(inquiry.createdAt).toISOString().slice(0, 7); // YYYY-MM
          monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        });

        const monthlyTrend = Object.entries(monthlyStats)
          .map(([month, count]) => ({
            month,
            count,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return {
          statusBreakdown,
          eventTypes,
          avgGuestCount,
          conversionRate,
          totalInquiries,
          monthlyTrend,
        };
      }),

    // Generate weekly report data
    generateWeeklyReport: protectedProcedure
      .query(async ({ ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Calculate date range (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get orders
        const ordersData = await db.select().from(orders)
          .where(and(
            sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
            sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
            eq(orders.paymentStatus, 'paid')
          ));

        // Calculate metrics
        const totalRevenue = ordersData.reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalOrders = ordersData.length;
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';

        // Get reservations
        const reservationsData = await db.select().from(reservations)
          .where(and(
            sql`DATE(${reservations.createdAt}) >= ${startDateStr}`,
            sql`DATE(${reservations.createdAt}) <= ${endDateStr}`
          ));

        // Get order items for top item
        const orderItemsData = await db.select().from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(and(
            sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
            sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
            eq(orders.paymentStatus, 'paid')
          ));

        // Calculate top item
        const itemSales: Record<string, { name: string; quantity: number }> = {};
        orderItemsData.forEach(item => {
          const itemName = item.menu_items.name;
          if (!itemSales[itemName]) {
            itemSales[itemName] = { name: itemName, quantity: 0 };
          }
          itemSales[itemName].quantity += item.order_items.quantity;
        });

        const topItemData = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity)[0];
        const topItem = topItemData ? topItemData.name : 'N/A';
        const topItemSales = topItemData ? topItemData.quantity : 0;

        // Calculate busiest day
        const dayCounts: Record<string, number> = {};
        ordersData.forEach(order => {
          const day = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        const busiestDayData = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        const busiestDay = busiestDayData ? busiestDayData[0] : 'N/A';
        const busiestDayOrders = busiestDayData ? busiestDayData[1] : 0;

        // Calculate peak hour
        const hourCounts: Record<number, number> = {};
        ordersData.forEach(order => {
          const hour = new Date(order.createdAt).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHourData = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        const peakHour = peakHourData ? `${peakHourData[0]}:00` : 'N/A';

        // Get customer insights
        const customerInsights = await db.select({
          customerEmail: orders.customerEmail,
          orderCount: sql<number>`COUNT(*)`,
        })
          .from(orders)
          .where(and(
            sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
            sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
            eq(orders.paymentStatus, 'paid')
          ))
          .groupBy(orders.customerEmail);

        const newCustomers = customerInsights.filter(c => c.orderCount === 1).length;
        const repeatCustomers = customerInsights.filter(c => c.orderCount > 1).length;
        const repeatRate = customerInsights.length > 0 
          ? `${((repeatCustomers / customerInsights.length) * 100).toFixed(1)}%`
          : '0%';

        // Get alerts
        const pendingTestimonials = await db.select({ count: sql<number>`COUNT(*)` })
          .from(testimonials)
          .where(eq(testimonials.isApproved, false));

        const unconfirmedReservations = await db.select({ count: sql<number>`COUNT(*)` })
          .from(reservations)
          .where(eq(reservations.status, 'pending'));

        const allMenuItems = await db.select().from(menuItems);
        const orderedItemIds = new Set(orderItemsData.map(item => item.order_items.menuItemId));
        const neverOrderedCount = allMenuItems.filter(item => !orderedItemIds.has(item.id)).length;

        return {
          startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          totalRevenue: totalRevenue.toFixed(2),
          totalOrders,
          avgOrderValue,
          totalReservations: reservationsData.length,
          topItem,
          topItemSales,
          busiestDay,
          busiestDayOrders,
          peakHour,
          newCustomers,
          repeatCustomers,
          repeatRate,
          pendingTestimonials: pendingTestimonials[0]?.count || 0,
          unconfirmedReservations: unconfirmedReservations[0]?.count || 0,
          neverOrderedCount,
          dashboardUrl: `${process.env.BASE_URL}/admin/dashboard`,
        };
      }),

    generateAnalyticsPDF: protectedProcedure
      .input(z.object({
        dateRange: z.string(),
        tab: z.string(),
        metrics: z.record(z.string(), z.any()),
        charts: z.array(z.object({
          title: z.string(),
          data: z.array(z.any()),
        })),
      }))
      .mutation(async ({ ctx, input }) => {        const { generateAnalyticsReportPDF } = await import('./pdf-analytics');
        const pdfBuffer = await generateAnalyticsReportPDF({
          dateRange: input.dateRange,
          tab: input.tab,
          metrics: input.metrics,
          charts: input.charts,
        });

        // Return base64 encoded PDF
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `analytics-${input.tab}-${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }),

    createCategory: protectedProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(menuCategories).values(input);
        return { success: true };
      }),

    updateCategory: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
        return { success: true };
      }),

    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(menuCategories).where(eq(menuCategories.id, input.id));
        return { success: true };
      }),

    toggleCategoryActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuCategories).set({ isActive: input.isActive }).where(eq(menuCategories.id, input.id));
        return { success: true };
      }),

    bulkUpdateCategories: protectedProcedure
      .input(z.object({
        categoryIds: z.array(z.number()),
        operation: z.enum(['activate', 'deactivate', 'delete']),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { categoryIds, operation } = input;

        if (operation === 'activate') {
          for (const id of categoryIds) {
            await db.update(menuCategories).set({ isActive: true }).where(eq(menuCategories.id, id));
          }
        } else if (operation === 'deactivate') {
          for (const id of categoryIds) {
            await db.update(menuCategories).set({ isActive: false }).where(eq(menuCategories.id, id));
          }
        } else if (operation === 'delete') {
          for (const id of categoryIds) {
            await db.delete(menuCategories).where(eq(menuCategories.id, id));
          }
        }

        return { success: true };
      }),

    uploadOptimizedImage: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        filename: z.string(),
        quality: z.number().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {        try {
          // Convert base64 to buffer
          const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Optimize and upload
          const { url, key } = await optimizeAndUploadImage(
            imageBuffer,
            input.filename,
            input.quality || 80
          );
          
          return { success: true, url, key };
        } catch (error: any) {
          console.error('[Upload Error]', error);
          throw new Error(error.message || 'Failed to upload image');
        }
      }),

    createMenuItem: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        price: z.number(),
        imageUrl: z.string().optional(),
        isVegan: z.boolean(),
        isGlutenFree: z.boolean(),
        isHalal: z.boolean(),
        allergens: z.string().optional(),
        isAvailable: z.boolean(),
        isFeatured: z.boolean(),
        isChefSpecial: z.boolean(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [result] = await db.insert(menuItems).values({
          ...input,
          price: input.price.toString(),
        });

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'create',
          entityType: 'menu_item',
          entityId: result.insertId,
          entityName: input.name,
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    updateMenuItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        price: z.number(),
        imageUrl: z.string().optional(),
        isVegan: z.boolean(),
        isGlutenFree: z.boolean(),
        isHalal: z.boolean(),
        allergens: z.string().optional(),
        isAvailable: z.boolean(),
        isFeatured: z.boolean(),
        isChefSpecial: z.boolean(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get existing item for audit log
        const [existingItem] = await db.select().from(menuItems).where(eq(menuItems.id, input.id)).limit(1);
        if (!existingItem) throw new Error('Menu item not found');

        const { id, ...data } = input;
        await db.update(menuItems).set({
          ...data,
          price: data.price.toString(),
        }).where(eq(menuItems.id, id));

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'update',
          entityType: 'menu_item',
          entityId: id,
          entityName: input.name,
          changes: createChangesObject(existingItem, { ...data, price: data.price.toString() }),
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    deleteMenuItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get item details before deletion for audit log
        const [item] = await db.select().from(menuItems).where(eq(menuItems.id, input.id)).limit(1);
        if (!item) throw new Error('Menu item not found');

        await db.delete(menuItems).where(eq(menuItems.id, input.id));

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'delete',
          entityType: 'menu_item',
          entityId: input.id,
          entityName: item.name,
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    bulkUpdatePrices: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        priceChange: z.number(), // percentage change, e.g., 10 for 10% increase, -5 for 5% decrease
      }))
      .mutation(async ({ input, ctx }) => {        const { itemIds, priceChange } = input;
        
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get current items
        const items = await db.select().from(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);        
        // Update each item's price
        for (const item of items) {
          const currentPrice = parseFloat(item.price);
          const newPrice = currentPrice * (1 + priceChange / 100);
          await db.update(menuItems)
            .set({ price: newPrice.toFixed(2) })
            .where(eq(menuItems.id, item.id));
        }

        return { success: true, updatedCount: items.length };
      }),

    bulkToggleAvailability: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { itemIds, isAvailable } = input;
        
        for (const id of itemIds) {
          await db.update(menuItems)
            .set({ isAvailable })
            .where(eq(menuItems.id, id));
        }

        return { success: true, updatedCount: itemIds.length };
      }),

    duplicateMenuItem: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [item] = await db.select().from(menuItems).where(eq(menuItems.id, input.id)).limit(1);
        
        if (!item) {
          throw new Error('Menu item not found');
        }

        // Create a copy with a new slug
        const timestamp = Date.now();
        const newSlug = `${item.slug}-copy-${timestamp}`;
        const newName = `${item.name} (Copy)`;

        await db.insert(menuItems).values({
          categoryId: item.categoryId,
          name: newName,
          slug: newSlug,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isVegan: item.isVegan,
          isGlutenFree: item.isGlutenFree,
          isHalal: item.isHalal,
          allergens: item.allergens,
          isAvailable: false, // Start as unavailable
          isFeatured: false,
          isChefSpecial: false,
          displayOrder: item.displayOrder,
        });

        return { success: true };
      }),

    getMenuItems: protectedProcedure
      .query(async ({ ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        return await db.select().from(menuItems).orderBy(menuItems.displayOrder);
      }),

    toggleMenuItemAvailable: protectedProcedure
      .input(z.object({ id: z.number(), isAvailable: z.boolean() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuItems).set({ isAvailable: input.isAvailable }).where(eq(menuItems.id, input.id));
        return { success: true };
      }),

    toggleMenuItemStock: protectedProcedure
      .input(z.object({ id: z.number(), outOfStock: z.boolean() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuItems).set({ outOfStock: input.outOfStock }).where(eq(menuItems.id, input.id));
        return { success: true };
      }),

    bulkUpdateMenuItems: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        operation: z.enum(['priceChange', 'makeAvailable', 'makeUnavailable', 'markInStock', 'markOutOfStock', 'delete', 'duplicate']),
        priceChangePercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { itemIds, operation, priceChangePercent } = input;

        if (itemIds.length === 0) {
          throw new Error('No items selected');
        }

        // Perform bulk operation based on type
        switch (operation) {
          case 'priceChange':
            if (priceChangePercent === undefined) {
              throw new Error('Price change percent is required');
            }
            // Get current items and update prices
            const items = await db.select().from(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`); 
            for (const item of items) {
              const currentPrice = parseFloat(item.price);
              const newPrice = (currentPrice * (1 + priceChangePercent / 100)).toFixed(2);
              await db.update(menuItems).set({ price: newPrice }).where(eq(menuItems.id, item.id));
            }
            break;
          case 'makeAvailable':
            await db.update(menuItems).set({ isAvailable: true }).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
          case 'makeUnavailable':
            await db.update(menuItems).set({ isAvailable: false }).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
          case 'markInStock':
            await db.update(menuItems).set({ outOfStock: false }).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
          case 'markOutOfStock':
            await db.update(menuItems).set({ outOfStock: true }).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
          case 'delete':
            // Check if any items have associated order items
            const itemsWithOrders = await db.select({ menuItemId: orderItemsTable.menuItemId })
              .from(orderItemsTable)
              .where(sql`${orderItemsTable.menuItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
              .groupBy(orderItemsTable.menuItemId);
            
            if (itemsWithOrders.length > 0) {
              const itemsWithOrdersIds = itemsWithOrders.map(item => item.menuItemId);
              throw new Error(`Cannot delete menu items that have been ordered. ${itemsWithOrdersIds.length} item(s) have existing orders.`);
            }
            
            await db.delete(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
          case 'duplicate':
            // Get items to duplicate
            const itemsToDuplicate = await db.select().from(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            
            // Create duplicates with " (Copy)" suffix
            for (const item of itemsToDuplicate) {
              // Generate unique slug by appending timestamp
              const uniqueSlug = `${item.slug}-copy-${Date.now()}`;
              
              await db.insert(menuItems).values({
                name: `${item.name} (Copy)`,
                slug: uniqueSlug,
                description: item.description,
                price: item.price,
                categoryId: item.categoryId,
                imageUrl: item.imageUrl,
                isAvailable: item.isAvailable,
                isFeatured: false, // Don't duplicate featured status
                isChefSpecial: false, // Don't duplicate chef special status
                isVegan: item.isVegan,
                isGlutenFree: item.isGlutenFree,
                isHalal: item.isHalal,
                allergens: item.allergens,
                prepTimeMinutes: item.prepTimeMinutes,
                outOfStock: item.outOfStock,
                displayOrder: item.displayOrder,
              });
            }
            break;
        }

        return { success: true, updatedCount: itemIds.length };
      }),

    getOrders: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get all orders
      const ordersResult = await db.select().from(orders);
      
      // For each order, fetch its items from order_items table
      const ordersWithItems = await Promise.all(
        ordersResult.map(async (order) => {
          const items = await db
            .select()
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, order.id));
          
          // Format items as JSON string to match expected format
          const itemsJson = JSON.stringify(
            items.map(item => ({
              name: item.menuItemName,
              quantity: item.quantity,
              price: item.price,
            }))
          );
          
          return {
            ...order,
            items: itemsJson,
          };
        })
      );
      
      return ordersWithItems;
    }),

    getCompletedOrders: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();  
      if (!db) throw new Error('Database not available');

      // Get orders completed in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const completedOrders = await db
        .select()
        .from(orders)
        .where(sql`${orders.status} = 'completed' AND ${orders.updatedAt} >= ${twentyFourHoursAgo}`);
      
      // For each order, fetch its items
      const ordersWithItems = await Promise.all(
        completedOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, order.id));
          
          const itemsJson = JSON.stringify(
            items.map(item => ({
              name: item.menuItemName,
              quantity: item.quantity,
              price: item.price,
            }))
          );
          
          return {
            ...order,
            items: itemsJson,
          };
        })
      );
      
      // Sort by completion time (most recent first)
      return ordersWithItems.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }),

    updateOrderStatus: protectedProcedure
      .input(z.object({ orderId: z.number(), status: z.string() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get order details before updating
        const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
        if (!order) {
          throw new Error('Order not found');
        }

        // Update timeline with new status change
        let timeline: Array<{status: string, timestamp: string}> = [];
        try {
          timeline = order.timeline ? JSON.parse(order.timeline) : [];
        } catch (e) {
          console.error('Failed to parse timeline:', e);
          timeline = [];
        }
        timeline.push({
          status: input.status,
          timestamp: new Date().toISOString(),
        });

        // Update order status and timeline
        await db.update(orders).set({ 
          status: input.status as any,
          timeline: JSON.stringify(timeline),
        }).where(eq(orders.id, input.orderId));

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'status_change',
          entityType: 'order',
          entityId: input.orderId,
          entityName: `Order #${order.orderNumber}`,
          changes: createChangesObject(
            { status: order.status },
            { status: input.status }
          ),
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        // Send status update email to customer
        await sendOrderStatusUpdateEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: input.status,
          orderType: order.orderType,
          scheduledFor: order.scheduledFor,
        });

        // Send SMS notifications for all status changes
        if (order.customerPhone) {
          const formattedPhone = formatPhoneNumberE164(order.customerPhone);
          
          // Map order status to SMS template type
          let templateType: string | null = null;
          let estimatedMinutes = 30; // Default estimated time
          
          switch (input.status) {
            case 'confirmed':
              templateType = 'order_confirmed';
              break;
            case 'preparing':
              templateType = 'order_preparing';
              break;
            case 'ready':
              if (order.orderType === 'pickup') {
                templateType = 'order_ready';
              }
              break;
            case 'out_for_delivery':
              if (order.orderType === 'delivery') {
                templateType = 'out_for_delivery';
              }
              break;
            case 'delivered':
              templateType = 'order_delivered';
              break;
            case 'delayed':
              templateType = 'order_delayed';
              estimatedMinutes = 45; // Extended time for delayed orders
              break;
            case 'cancelled':
              templateType = 'order_cancelled';
              break;
            case 'completed':
              templateType = 'order_completed';
              break;
          }
          
          // Send SMS if template type is determined
          if (templateType) {
            await sendOrderStatusSMS(
              order.customerName,
              formattedPhone,
              order.orderNumber,
              templateType,
              estimatedMinutes,
              order.smsOptIn ?? true // Customer's SMS preference (default true for existing orders)
            );
          }
        }

        // Send review request after order is delivered or completed
        if (input.status === 'delivered' || input.status === 'completed') {
          try {
            const { sendReviewRequestEmail } = await import('./email');
            await sendReviewRequestEmail({
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              orderNumber: order.orderNumber,
              orderDate: order.createdAt,
            });

            // Also send review request SMS
            if (order.customerPhone) {
              const formattedPhone = formatPhoneNumberE164(order.customerPhone);
              await sendOrderStatusSMS(
                order.customerName,
                formattedPhone,
                order.orderNumber,
                'review_request',
                30,
                order.smsOptIn ?? true
              );
            }
          } catch (error) {
            console.error('[Review Request] Failed to send review request:', error);
            // Don't fail the status update if review request fails
          }
        }

        return { success: true };
      }),

    getReservations: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const reservationsResult = await db.select().from(reservations);
      return reservationsResult;
    }),

    updateReservationStatus: protectedProcedure
      .input(z.object({ reservationId: z.number(), status: z.string() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(reservations).set({ status: input.status as any }).where(eq(reservations.id, input.reservationId));
        return { success: true };
      }),

    getSettings: publicProcedure
      .query(async ({ ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const settings = await db.select().from(siteSettings);
        return settings;
      }),

    updateSetting: protectedProcedure
      .input(z.object({ settingKey: z.string(), settingValue: z.string() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if setting exists
        const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, input.settingKey)).limit(1);

        const action = existing ? 'update' : 'create';
        const oldValue = existing?.settingValue;

        if (existing) {
          // Update existing setting
          await db.update(siteSettings)
            .set({ settingValue: input.settingValue })
            .where(eq(siteSettings.settingKey, input.settingKey));
        } else {
          // Insert new setting
          await db.insert(siteSettings).values({
            settingKey: input.settingKey,
            settingValue: input.settingValue,
          });
        }

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action,
          entityType: 'settings',
          entityName: input.settingKey,
          changes: existing ? createChangesObject(
            { value: oldValue },
            { value: input.settingValue }
          ) : undefined,
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    sendTestDailySalesEmail: protectedProcedure
      .mutation(async ({ ctx }) => {        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        // Generate sample data for test email
        const testData = {
          totalRevenue: 1250.50,
          totalOrders: 18,
          avgOrderValue: 69.47,
          topItems: [
            { name: 'Jollof Rice', quantity: 12 },
            { name: 'Suya Platter', quantity: 8 },
            { name: 'Egusi Soup', quantity: 6 },
          ],
        };

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ctx.user.email || '',
          subject: '[TEST] Daily Sales Summary',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 TEST: Daily Sales Summary</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This is a preview of your daily sales email</p>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <h3>Today's Performance</h3>
                <ul>
                  <li><strong>Total Revenue:</strong> £${testData.totalRevenue.toFixed(2)}</li>
                  <li><strong>Total Orders:</strong> ${testData.totalOrders}</li>
                  <li><strong>Average Order Value:</strong> £${testData.avgOrderValue.toFixed(2)}</li>
                </ul>
                <h3>Top Selling Items</h3>
                <ul>
                  ${testData.topItems.map(item => `<li>${item.name}: ${item.quantity} orders</li>`).join('')}
                </ul>
              </div>
            </div>
          `,
        });

        return { success: true, message: 'Test email sent to ' + ctx.user.email };
      }),

    sendTestWeeklyReportEmail: protectedProcedure
      .mutation(async ({ ctx }) => {        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ctx.user.email || '',
          subject: '[TEST] Weekly Performance Report',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 TEST: Weekly Performance Report</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This is a preview of your weekly report email</p>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <h3>Week Summary</h3>
                <p>Sample weekly performance data would appear here with charts and insights.</p>
              </div>
            </div>
          `,
        });

        return { success: true, message: 'Test email sent to ' + ctx.user.email };
      }),

    sendTestReservationReminderEmail: protectedProcedure
      .mutation(async ({ ctx }) => {        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ctx.user.email || '',
          subject: '[TEST] Reservation Reminder',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 TEST: Reservation Reminder</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This is a preview of reservation reminder emails</p>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <p>Dear Customer,</p>
                <p>This is a reminder that you have a reservation tomorrow at 7:00 PM for 4 people.</p>
                <p>We look forward to seeing you!</p>
              </div>
            </div>
          `,
        });

        return { success: true, message: 'Test email sent to ' + ctx.user.email };
      }),

    sendTestAnomalyAlertEmail: protectedProcedure
      .mutation(async ({ ctx }) => {        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ctx.user.email || '',
          subject: '[TEST] Security Anomaly Alert',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 TEST: Security Anomaly Alert</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This is a preview of security anomaly alerts</p>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>Anomaly Type:</strong> Multiple Failed Operations</p>
                <p><strong>User:</strong> Sample User</p>
                <p><strong>Details:</strong> 3 failed operations detected in 5 minutes</p>
                <p>This alert helps you monitor suspicious patterns in your system.</p>
              </div>
            </div>
          `,
        });

        return { success: true, message: 'Test email sent to ' + ctx.user.email };
      }),

    sendTestAuditAlertEmail: protectedProcedure
      .mutation(async ({ ctx }) => {        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ctx.user.email || '',
          subject: '[TEST] Critical Action Alert',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 TEST: Critical Action Alert</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This is a preview of critical action alerts</p>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>Action:</strong> Settings Modification</p>
                <p><strong>User:</strong> Sample Admin</p>
                <p><strong>Entity:</strong> Restaurant Settings</p>
                <p>This alert notifies you of important administrative changes.</p>
              </div>
            </div>
          `,
        });

        return { success: true, message: 'Test email sent to ' + ctx.user.email };
      }),

    sendTestReviewRequestEmail: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const resend = getResendClient();
        if (!resend) throw new Error('Email service not configured');

        // Create sample order data for test email
        const testOrder = {
          id: 99999,
          orderNumber: 'TEST-' + Date.now(),
          customerName: ctx.user.name || 'Test Customer',
          customerEmail: ctx.user.email || '',
          total: '45.99',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          items: [
            { menuItemName: 'Jollof Rice', quantity: 2, price: '12.99' },
            { menuItemName: 'Suya Platter', quantity: 1, price: '19.99' },
          ],
        };

        // Import and use the review request email function
        const { sendReviewRequestEmail } = await import('./reviewRequestEmail');
        await sendReviewRequestEmail(testOrder as any);

        return { success: true, message: 'Test review request email sent to ' + ctx.user.email };
      }),

    uploadLogo: protectedProcedure
      .input(z.object({ 
        fileData: z.string(), // base64 encoded image
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Convert base64 to buffer
        const base64Data = input.fileData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Save file locally to client/public/logos/ (same approach as menu images)
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Sanitize filename
        const sanitizedFileName = input.fileName
          .replace(/\s+/g, '-')
          .replace(/[^a-zA-Z0-9.-]/g, '')
          .toLowerCase();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileName = `logo-${randomSuffix}.${sanitizedFileName.split('.').pop()}`;
        
        // Ensure logos directory exists
        const logosDir = path.join(process.cwd(), 'client', 'public', 'logos');
        await fs.mkdir(logosDir, { recursive: true });
        
        // Write file
        const filePath = path.join(logosDir, fileName);
        await fs.writeFile(filePath, buffer);
        
        // Public URL path
        const publicUrl = `/logos/${fileName}`;
        
        // Save logo URL to settings
        const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'restaurant_logo')).limit(1);
        if (existing) {
          await db.update(siteSettings)
            .set({ settingValue: publicUrl })
            .where(eq(siteSettings.settingKey, 'restaurant_logo'));
        } else {
          await db.insert(siteSettings).values({
            settingKey: 'restaurant_logo',
            settingValue: publicUrl,
          });
        }

        return { success: true, url: publicUrl };
      }),

    getEmailPreviews: protectedProcedure
      .input(z.object({ templateType: z.enum(['orderConfirmation', 'reservationConfirmation', 'adminOrderNotification']) }))
      .query(async ({ ctx, input }) => {        const { generateEmailPreviews } = await import('./email');
        const previews = await generateEmailPreviews();
        
        return { html: previews[input.templateType] };
      }),

    getEmailTemplates: protectedProcedure
      .query(async ({ ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { emailTemplates } = await import('../drizzle/schema');
        const templates = await db.select().from(emailTemplates);
        return templates;
      }),

    saveEmailTemplate: protectedProcedure
      .input(z.object({
        templateType: z.string(),
        subject: z.string(),
        bodyHtml: z.string(),
        headerColor: z.string(),
        footerText: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { emailTemplates } = await import('../drizzle/schema');
        
        // Check if template exists
        const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateType, input.templateType));
        
        if (existing) {
          // Update existing template
          await db.update(emailTemplates)
            .set({
              subject: input.subject,
              bodyHtml: input.bodyHtml,
              headerColor: input.headerColor,
              footerText: input.footerText || null,
              updatedAt: new Date(),
            })
            .where(eq(emailTemplates.templateType, input.templateType));
        } else {
          // Insert new template
          await db.insert(emailTemplates).values({
            templateType: input.templateType,
            subject: input.subject,
            bodyHtml: input.bodyHtml,
            headerColor: input.headerColor,
            footerText: input.footerText || null,
            isActive: true,
          });
        }

        return { success: true };
      }),

    getEmailLogs: protectedProcedure
      .input(z.object({
        templateType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { emailLogs } = await import('../drizzle/schema');
        const { desc, and } = await import('drizzle-orm');
        
        // Build where clause
        let whereClause = undefined;
        if (input.templateType && input.status) {
          whereClause = and(
            eq(emailLogs.templateType, input.templateType),
            sql`${emailLogs.status} = ${input.status}`
          );
        } else if (input.templateType) {
          whereClause = eq(emailLogs.templateType, input.templateType);
        } else if (input.status) {
          whereClause = sql`${emailLogs.status} = ${input.status}`;
        }
        
        const logs = await db.select()
          .from(emailLogs)
          .where(whereClause)
          .orderBy(desc(emailLogs.sentAt))
          .limit(input.limit);

        return logs;
      }),

    getEmailStats: protectedProcedure
      .query(async ({ ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { emailLogs } = await import('../drizzle/schema');
        
        const allLogs = await db.select().from(emailLogs);
        
        return {
          totalSent: allLogs.length,
          delivered: allLogs.filter(log => log.status === 'delivered' || log.openedAt).length,
          opened: allLogs.filter(log => log.openedAt).length,
          bounced: allLogs.filter(log => log.status === 'bounced').length,
        };
      }),

    sendTestEmail: protectedProcedure
      .input(z.object({
        templateType: z.string(),
        recipientEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {        const { generateEmailPreviews } = await import('./email');
        const previews = await generateEmailPreviews();
        
        let html = '';
        let subject = '';
        
        switch (input.templateType) {
          case 'order_confirmation':
            html = previews.orderConfirmation;
            subject = '[TEST] Order Confirmation - #BO-PREVIEW-001';
            break;
          case 'reservation_confirmation':
            html = previews.reservationConfirmation;
            subject = '[TEST] Reservation Confirmed - Preview';
            break;
          case 'admin_order_notification':
            html = previews.adminOrderNotification;
            subject = '[TEST] New Order Notification - #BO-PREVIEW-001';
            break;
          default:
            throw new Error('Invalid template type');
        }

        const resend = getResendClient();
        if (!resend) {
          throw new Error('Email service not configured');
        }

        const { data: result, error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: input.recipientEmail,
          subject,
          html,
        });

        if (error) {
          console.error('[Email] Failed to send test email:', error);
          throw new Error('Failed to send test email');
        }

        console.log('[Email] Test email sent:', result?.id);
        return { success: true, emailId: result?.id };
      }),

    // Delivery Areas Management
    getDeliveryAreas: publicProcedure
      .query(async () => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { asc } = await import('drizzle-orm');
        const areas = await db.select()
          .from(deliveryAreas)
          .orderBy(asc(deliveryAreas.displayOrder));

        return areas;
      }),

    saveDeliveryArea: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        areaName: z.string().min(1),
        postcodesPrefixes: z.string().min(1),
        deliveryFee: z.number().min(0),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        radiusMeters: z.number().optional(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const action = input.id ? 'update' : 'create';
        let existingArea = null;

        if (input.id) {
          // Get existing area for audit log
          [existingArea] = await db.select().from(deliveryAreas).where(eq(deliveryAreas.id, input.id)).limit(1);

          // Update existing area
          await db.update(deliveryAreas)
            .set({
              areaName: input.areaName,
              postcodesPrefixes: input.postcodesPrefixes,
              deliveryFee: input.deliveryFee.toString(),
              latitude: input.latitude?.toString(),
              longitude: input.longitude?.toString(),
              radiusMeters: input.radiusMeters,
              displayOrder: input.displayOrder,
              updatedAt: new Date(),
            })
            .where(eq(deliveryAreas.id, input.id));
        } else {
          // Insert new area
          await db.insert(deliveryAreas).values({
            areaName: input.areaName,
            postcodesPrefixes: input.postcodesPrefixes,
            deliveryFee: input.deliveryFee.toString(),
            latitude: input.latitude?.toString(),
            longitude: input.longitude?.toString(),
            radiusMeters: input.radiusMeters,
            displayOrder: input.displayOrder,
          });
        }

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action,
          entityType: 'delivery_zone',
          entityId: input.id,
          entityName: input.areaName,
          changes: existingArea ? createChangesObject(existingArea, {
            areaName: input.areaName,
            postcodesPrefixes: input.postcodesPrefixes,
            deliveryFee: input.deliveryFee.toString(),
            latitude: input.latitude?.toString(),
            longitude: input.longitude?.toString(),
            radiusMeters: input.radiusMeters,
            displayOrder: input.displayOrder,
          }) : undefined,
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    deleteDeliveryArea: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get area details before deletion for audit log
        const [area] = await db.select().from(deliveryAreas).where(eq(deliveryAreas.id, input.id)).limit(1);
        if (!area) throw new Error('Delivery area not found');

        await db.delete(deliveryAreas).where(eq(deliveryAreas.id, input.id));

        // Log audit action
        await logAuditAction({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userRole: ctx.user.role,
          action: 'delete',
          entityType: 'delivery_zone',
          entityId: input.id,
          entityName: area.areaName,
          ipAddress: getIpAddress(ctx.req.headers),
          userAgent: ctx.req.headers['user-agent'] as string,
        });

        return { success: true };
      }),

    downloadReceipt: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Fetch order details
        const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) {
          throw new Error('Order not found');
        }

        // Fetch order items
        const items = await db.select({
          name: orderItemsTable.menuItemName,
          quantity: orderItemsTable.quantity,
          price: orderItemsTable.price,
        }).from(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));

        // Generate PDF
        const { generateOrderReceiptPDF } = await import('./pdf-receipt');
        const pdfBuffer = await generateOrderReceiptPDF({
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          orderType: order.orderType,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress || undefined,
          postcode: order.deliveryPostcode || undefined,
          scheduledFor: order.scheduledFor || undefined,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
          subtotal: parseFloat(order.subtotal),
          deliveryFee: parseFloat(order.deliveryFee),
          total: parseFloat(order.total),
          paymentStatus: order.paymentStatus === 'paid' ? 'Paid' : 'Pending',
        });

        // Return base64 encoded PDF
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `receipt-${order.orderNumber}.pdf`,
        };
      }),
  }),

  payment: router({
    createCheckoutSession: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        orderType: z.enum(['delivery', 'pickup']),
        deliveryAddress: z.string().optional(),
        deliveryPostcode: z.string().optional(),
        specialInstructions: z.string().optional(),
        preferredTime: z.string().optional(),
        smsOptIn: z.boolean().optional().default(true),
        items: z.array(z.object({
          menuItemId: z.number(),
          menuItemName: z.string(),
          quantity: z.number(),
          price: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = input.orderType === 'delivery' ? 3.99 : 0;
        const total = subtotal + deliveryFee;

        // Build line items for Stripe
        const lineItems = [
          ...input.items.map(item => ({
            price_data: {
              currency: 'gbp',
              product_data: {
                name: item.menuItemName,
              },
              unit_amount: Math.round(item.price * 100), // Convert to pence
            },
            quantity: item.quantity,
          })),
        ];

        // Add delivery fee if applicable
        if (deliveryFee > 0) {
          lineItems.push({
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Delivery Fee',
              },
              unit_amount: Math.round(deliveryFee * 100),
            },
            quantity: 1,
          });
        }

        // Store all order data in Stripe metadata (will be used by webhook to create order)
        const orderData = {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
          deliveryAddress: input.deliveryAddress || '',
          deliveryPostcode: input.deliveryPostcode || '',
          specialInstructions: input.specialInstructions || '',
          preferredTime: input.preferredTime || '',
          smsOptIn: input.smsOptIn ? 'true' : 'false',
          subtotal: subtotal.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          total: total.toFixed(2),
          items: JSON.stringify(input.items), // Store items as JSON string
        };

        // Create Stripe checkout session
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/checkout?cancelled=true`,
          customer_email: input.customerEmail,
          metadata: orderData,
          allow_promotion_codes: true,
          payment_intent_data: {
            metadata: orderData,
          },
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      }),

    verifyPayment: publicProcedure
      .input(z.object({
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ['payment_intent'],
        });
        
        if (session.payment_status === 'paid') {
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          // Get payment intent ID
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;

          if (paymentIntentId) {
            // Find order by payment intent ID (order was created by webhook)
            const [order] = await db.select().from(orders).where(eq(orders.paymentIntentId, paymentIntentId)).limit(1);
            
            if (order) {
              return {
                paymentStatus: 'paid',
                orderNumber: order.orderNumber,
                orderId: order.id,
              };
            }
          }

          // If order not found yet (webhook might be delayed), return payment status only
          return {
            paymentStatus: 'paid',
            orderNumber: null,
            orderId: null,
          };
        }

        return {
          paymentStatus: session.payment_status,
          orderNumber: null,
          orderId: null,
        };
      }),
  }),

  // Newsletter management endpoints
  subscribers: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const allSubscribers = await db.select().from(subscribers).orderBy(sql`${subscribers.subscribedAt} DESC`);
      return allSubscribers;
    }),

    unsubscribe: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(subscribers)
          .set({ isActive: false, unsubscribedAt: new Date() })
          .where(eq(subscribers.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(subscribers).where(eq(subscribers.id, input.id));
        return { success: true };
      }),
  }),

  // Email campaigns endpoints
  campaigns: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const allCampaigns = await db.select().from(emailCampaigns).orderBy(sql`${emailCampaigns.createdAt} DESC`);
      return allCampaigns;
    }),

    create: protectedProcedure
      .input(z.object({
        campaignName: z.string(),
        subject: z.string(),
        bodyHtml: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [campaign] = await db.insert(emailCampaigns).values({
          ...input,
          createdBy: ctx.user.id,
          status: 'draft',
        }).$returningId();

        return { success: true, campaignId: campaign.id };
      }),

    send: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get campaign details
        const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, input.campaignId)).limit(1);
        if (!campaign) {
          throw new Error('Campaign not found');
        }

        // Get active subscribers
        const activeSubscribers = await db.select().from(subscribers).where(eq(subscribers.isActive, true));

        if (activeSubscribers.length === 0) {
          throw new Error('No active subscribers found');
        }

        // Update campaign status to sending
        await db.update(emailCampaigns)
          .set({ status: 'sending', recipientCount: activeSubscribers.length })
          .where(eq(emailCampaigns.id, input.campaignId));

        let sentCount = 0;
        let failedCount = 0;

        // Send emails to all subscribers
        for (const subscriber of activeSubscribers) {
          try {
            const result = await sendCampaignEmail(
              subscriber.email,
              subscriber.name || 'Valued Customer',
              campaign.subject,
              campaign.bodyHtml
            );

            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            console.error(`Failed to send campaign to ${subscriber.email}:`, error);
            failedCount++;
          }
        }

        // Update campaign with final counts
        await db.update(emailCampaigns)
          .set({
            status: 'sent',
            sentCount,
            failedCount,
            sentAt: new Date(),
          })
          .where(eq(emailCampaigns.id, input.campaignId));

        return { success: true, sentCount, failedCount, totalSubscribers: activeSubscribers.length };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(emailCampaigns).where(eq(emailCampaigns.id, input.id));
        return { success: true };
      }),
  }),

  smsTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {      const templates = await getAllSmsTemplates();
      return templates;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {        const template = await getSmsTemplateById(input.id);
        if (!template) {
          throw new Error('Template not found');
        }
        return template;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        templateName: z.string().min(1),
        message: z.string().min(1),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(smsTemplates)
          .set({
            templateName: input.templateName,
            message: input.message,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(smsTemplates.id, input.id));

        return { success: true };
      }),

    sendTest: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        phoneNumber: z.string().min(10),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get template
        const template = await getSmsTemplateById(input.templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        // Format phone number
        const formattedPhone = formatPhoneNumberE164(input.phoneNumber);

        // Handle different template types with appropriate test data
        switch (template.templateType) {
          case 'admin_new_reservation': {
            const { sendAdminNewReservationSMS } = await import('./services/sms.service');
            await sendAdminNewReservationSMS(
              formattedPhone,
              'John Smith',
              4, // partySize
              '15/02/2026', // date
              '19:00' // time
            );
            break;
          }
          case 'admin_catering_quote': {
            const { sendAdminCateringQuoteRequestSMS } = await import('./services/sms.service');
            await sendAdminCateringQuoteRequestSMS(
              formattedPhone,
              'John Smith',
              'Wedding Reception', // eventType
              50, // guestCount
              '20/03/2026' // eventDate
            );
            break;
          }
          case 'admin_new_order': {
            const { sendAdminNewOrderSMS } = await import('./services/sms.service');
            await sendAdminNewOrderSMS(
              formattedPhone,
              'BO-12345',
              45.99, // orderTotal
              'delivery' // orderType
            );
            break;
          }
          case 'admin_weekly_report': {
            const { sendAdminWeeklyReportSMS } = await import('./services/sms.service');
            await sendAdminWeeklyReportSMS(
              formattedPhone,
              127, // totalOrders
              2849.50, // totalRevenue
              'Jollof Rice Special' // topItem
            );
            break;
          }
          case 'catering_quote_request': {
            const { sendCateringQuoteRequestSMS } = await import('./services/sms.service');
            await sendCateringQuoteRequestSMS(
              'John Smith',
              formattedPhone,
              'Wedding Reception', // cateringType
              50, // guestCount
              new Date('2026-03-20') // eventDate
            );
            break;
          }
          case 'event_inquiry_response': {
            const { sendEventInquiryResponseSMS } = await import('./services/sms.service');
            await sendEventInquiryResponseSMS(
              formattedPhone,
              'John Smith',
              'Wedding Reception', // eventType
              'We can accommodate your event! Check your email for details.' // responseMessage
            );
            break;
          }
          case 'newsletter_confirmation': {
            const { sendNewsletterConfirmationSMS } = await import('./services/sms.service');
            await sendNewsletterConfirmationSMS(
              'John Smith',
              formattedPhone,
              'john.smith@example.com' // customerEmail
            );
            break;
          }
          default:
            // Customer order templates - use existing function
            await sendOrderStatusSMS(
              'John Smith', // customerName
              formattedPhone,
              'BO-12345', // orderNumber
              template.templateType,
              30, // estimatedMinutes
              true // smsOptIn (always true for test)
            );
        }

        return { success: true };
      }),
  }),

  openingHours: router({
    list: protectedProcedure.query(async ({ ctx }) => {      const hours = await getAllOpeningHours();
      return hours;
    }),

    getByDay: protectedProcedure
      .input(z.object({ dayOfWeek: z.number().min(0).max(6) }))
      .query(async ({ input, ctx }) => {        const hours = await getOpeningHoursByDay(input.dayOfWeek);
        if (!hours) {
          throw new Error('Opening hours not found for this day');
        }
        return hours;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        isClosed: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(openingHours)
          .set({
            openTime: input.openTime,
            closeTime: input.closeTime,
            isClosed: input.isClosed,
            updatedAt: new Date(),
          })
          .where(eq(openingHours.id, input.id));

        return { success: true };
      }),

    updateBulk: protectedProcedure
      .input(z.array(z.object({
        id: z.number(),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        isClosed: z.boolean(),
      })))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Update each day's hours
        for (const hours of input) {
          await db.update(openingHours)
            .set({
              openTime: hours.openTime,
              closeTime: hours.closeTime,
              isClosed: hours.isClosed,
              updatedAt: new Date(),
            })
            .where(eq(openingHours.id, hours.id));
        }

        return { success: true };
      }),
  }),

  eventInquiries: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        eventType: z.string(),
        venueAddress: z.string(),
        eventDate: z.date().optional(),
        guestCount: z.number().optional(),
        budget: z.string().optional(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(eventInquiries).values({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          eventType: input.eventType,
          venueAddress: input.venueAddress,
          eventDate: input.eventDate || null,
          guestCount: input.guestCount || null,
          budget: input.budget || null,
          message: input.message,
        });

        // Send email notifications
        try {
          const { sendEventInquiryConfirmationEmail, sendAdminEventInquiryNotification } = await import('./email');
          
          const emailData = {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            eventType: input.eventType,
            venueAddress: input.venueAddress,
            eventDate: input.eventDate,
            guestCount: input.guestCount,
            budget: input.budget,
            message: input.message,
          };

          // Send customer confirmation
          await sendEventInquiryConfirmationEmail(emailData);

          // Send admin notification
          await sendAdminEventInquiryNotification(emailData);
        } catch (emailError: any) {
          console.error('[EventInquiry] Failed to send email notifications:', emailError.message);
          // Don't fail the inquiry if email fails
        }

        // Send admin SMS notification
        try {
          const { sendAdminCateringQuoteRequestSMS } = await import('./services/sms.service');
          
          // Get admin phone from site settings
          const phoneSettings = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'contact_phone'));
          const adminPhone = phoneSettings[0]?.settingValue;
          
          if (adminPhone && input.eventDate && input.guestCount) {
            await sendAdminCateringQuoteRequestSMS(
              adminPhone,
              input.customerName,
              input.eventType,
              input.guestCount,
              input.eventDate.toLocaleDateString('en-GB')
            );
          }
        } catch (smsError: any) {
          console.error('[EventInquiry] Failed to send admin SMS notification:', smsError.message);
          // Don't fail the inquiry if SMS fails
        }

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(['new', 'contacted', 'quoted', 'booked', 'cancelled']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { desc } = await import('drizzle-orm');

        let query = db.select().from(eventInquiries);

        if (input?.status) {
          query = query.where(eq(eventInquiries.status, input.status)) as any;
        }

        const results = await query
          .orderBy(desc(eventInquiries.createdAt))
          .limit(input?.limit || 50);

        return results;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['new', 'contacted', 'quoted', 'booked', 'cancelled']),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get inquiry details for notifications
        const [inquiry] = await db.select().from(eventInquiries).where(eq(eventInquiries.id, input.id));
        if (!inquiry) {
          throw new Error('Event inquiry not found');
        }

        // Update status
        await db.update(eventInquiries)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(eventInquiries.id, input.id));

        // Send email notification for status change
        try {
          const { sendEventInquiryStatusEmail } = await import('./email');
          await sendEventInquiryStatusEmail({
            customerName: inquiry.customerName,
            customerEmail: inquiry.customerEmail,
            eventType: inquiry.eventType,
            venueAddress: inquiry.venueAddress,
            eventDate: inquiry.eventDate,
            guestCount: inquiry.guestCount,
            status: input.status,
          });
        } catch (emailError: any) {
          console.error('[EventInquiry] Failed to send status email:', emailError.message);
        }
        
        // Send Event Confirmation email and SMS when status is 'booked'
        if (input.status === 'booked' && inquiry.eventDate && inquiry.guestCount) {
          try {
            const { sendEventConfirmationEmail } = await import('./email');
            await sendEventConfirmationEmail({
              customerName: inquiry.customerName,
              customerEmail: inquiry.customerEmail,
              eventType: inquiry.eventType,
              eventDate: inquiry.eventDate,
              guestCount: inquiry.guestCount,
              specialRequests: inquiry.message,
            });
            
            // Send SMS confirmation
            if (inquiry.customerPhone) {
              const { sendEventConfirmationSMS } = await import('./services/sms.service');
              await sendEventConfirmationSMS(
                inquiry.customerName,
                inquiry.customerPhone,
                inquiry.eventType,
                inquiry.eventDate,
                inquiry.guestCount
              );
            }
          } catch (error: any) {
            console.error('[EventInquiry] Failed to send event confirmation:', error.message);
          }
        }

        return { success: true };
      }),
      
    sendResponse: protectedProcedure
      .input(z.object({
        id: z.number(),
        responseMessage: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get inquiry details
        const [inquiry] = await db.select().from(eventInquiries).where(eq(eventInquiries.id, input.id));
        if (!inquiry) {
          throw new Error('Event inquiry not found');
        }

        // Send Event Inquiry Response email and SMS
        try {
          const { sendEventInquiryResponseEmail } = await import('./email');
          await sendEventInquiryResponseEmail({
            customerName: inquiry.customerName,
            customerEmail: inquiry.customerEmail,
            eventType: inquiry.eventType,
            responseMessage: input.responseMessage,
          });
          
          // Send SMS response
          if (inquiry.customerPhone) {
            const { sendEventInquiryResponseSMS } = await import('./services/sms.service');
            await sendEventInquiryResponseSMS(
              inquiry.customerName,
              inquiry.customerPhone,
              inquiry.eventType,
              input.responseMessage
            );
          }
        } catch (error: any) {
          console.error('[EventInquiry] Failed to send response:', error.message);
          throw new Error('Failed to send response to customer');
        }

        // Update status to 'contacted' if it was 'new'
        if (inquiry.status === 'new') {
          await db.update(eventInquiries)
            .set({ status: 'contacted', updatedAt: new Date() })
            .where(eq(eventInquiries.id, input.id));
        }

        return { success: true };
      }),
      
    requestCateringQuote: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        cateringType: z.string(),
        guestCount: z.number(),
        eventDate: z.date(),
        specialRequests: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Insert catering inquiry into event inquiries table
        await db.insert(eventInquiries).values({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          eventType: input.cateringType,
          venueAddress: 'Catering Service', // Placeholder for catering
          eventDate: input.eventDate,
          guestCount: input.guestCount,
          message: input.specialRequests || 'Catering quote request',
          status: 'new',
        });

        // Send Catering Quote Request email and SMS
        try {
          const { sendCateringQuoteRequestEmail } = await import('./email');
          await sendCateringQuoteRequestEmail({
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            cateringType: input.cateringType,
            guestCount: input.guestCount,
            eventDate: input.eventDate,
            specialRequests: input.specialRequests,
          });
          
          // Send SMS confirmation
          if (input.customerPhone) {
            const { sendCateringQuoteRequestSMS } = await import('./services/sms.service');
            await sendCateringQuoteRequestSMS(
              input.customerName,
              input.customerPhone,
              input.cateringType,
              input.guestCount,
              input.eventDate
            );
          }
        } catch (error: any) {
          console.error('[CateringQuote] Failed to send confirmation:', error.message);
          // Don't fail the request if email/SMS fails
        }

        return { success: true };
      }),
  }),

  // Customer reviews for menu items
  reviews: router({
    // Submit a new review (public)
    create: publicProcedure
      .input(z.object({
        menuItemId: z.number(),
        customerName: z.string().min(1).max(100),
        customerEmail: z.string().email().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [review] = await db.insert(menuItemReviews).values({
          menuItemId: input.menuItemId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          rating: input.rating,
          comment: input.comment,
          isApproved: false, // Requires admin approval
        });

        return { success: true, reviewId: review.insertId };
      }),

    // Get approved reviews for a menu item (public)
    getByMenuItem: publicProcedure
      .input(z.object({
        menuItemId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const reviews = await db
          .select()
          .from(menuItemReviews)
          .where(sql`${menuItemReviews.menuItemId} = ${input.menuItemId} AND ${menuItemReviews.isApproved} = true`)
          .orderBy(desc(menuItemReviews.createdAt));

        return reviews;
      }),

    // Get average rating for a menu item (public)
    getAverageRating: publicProcedure
      .input(z.object({
        menuItemId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [result] = await db
          .select({
            averageRating: sql<number>`AVG(${menuItemReviews.rating})`,
            totalReviews: sql<number>`COUNT(*)`,
          })
          .from(menuItemReviews)
          .where(sql`${menuItemReviews.menuItemId} = ${input.menuItemId} AND ${menuItemReviews.isApproved} = true`);

        return {
          averageRating: result?.averageRating ? parseFloat(result.averageRating.toFixed(1)) : 0,
          totalReviews: result?.totalReviews || 0,
        };
      }),

    // Admin: List all reviews with filtering
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'all']).optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        let query = db.select().from(menuItemReviews);

        if (input.status === 'pending') {
          query = query.where(eq(menuItemReviews.isApproved, false)) as any;
        } else if (input.status === 'approved') {
          query = query.where(eq(menuItemReviews.isApproved, true)) as any;
        }

        const results = await query
          .orderBy(desc(menuItemReviews.createdAt))
          .limit(input?.limit || 100);

        return results;
      }),

    // Admin: Approve a review
    approve: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .update(menuItemReviews)
          .set({ isApproved: true })
          .where(eq(menuItemReviews.id, input.id));

        return { success: true };
      }),

    // Admin: Delete a review
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .delete(menuItemReviews)
          .where(eq(menuItemReviews.id, input.id));

        return { success: true };
      }),
  }),

  // Gallery images
  gallery: router({
    // Get all active gallery images (public)
    list: publicProcedure
      .input(z.object({
        category: z.enum(['ambiance', 'dishes', 'events', 'team']).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conditions = [eq(galleryImages.isActive, true)];

        if (input.category) {
          conditions.push(eq(galleryImages.category, input.category));
        }

        const results = await db
          .select()
          .from(galleryImages)
          .where(and(...conditions))
          .orderBy(galleryImages.displayOrder, desc(galleryImages.createdAt));
        return results;
      }),

    // Admin: List all gallery images
    listAll: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const results = await db.select().from(galleryImages).orderBy(desc(galleryImages.createdAt));
      return results;
    }),

    // Admin: Create gallery image
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        imageUrl: z.string().url(),
        category: z.enum(['ambiance', 'dishes', 'events', 'team']),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(galleryImages).values({
          title: input.title,
          description: input.description,
          imageUrl: input.imageUrl,
          category: input.category,
          displayOrder: input.displayOrder || 0,
          isActive: true,
        });

        return { success: true };
      }),

    // Admin: Update gallery image
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
        category: z.enum(['ambiance', 'dishes', 'events', 'team']).optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...updates } = input;
        await db.update(galleryImages).set(updates).where(eq(galleryImages.id, id));

        return { success: true };
      }),

    // Admin: Delete gallery image
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(galleryImages).where(eq(galleryImages.id, input.id));

        return { success: true };
      }),

    // Admin: Toggle gallery image active status
    toggleActive: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .update(galleryImages)
          .set({ isActive: input.isActive })
          .where(eq(galleryImages.id, input.id));

        return { success: true };
      }),
  }),

  // Blog posts
  blog: router({
    // Get published blog posts (public)
    list: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const results = await db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.isPublished, true))
          .orderBy(desc(blogPosts.publishedAt))
          .limit(input?.limit || 20);

        return results;
      }),

    // Get single blog post by slug (public)
    getBySlug: publicProcedure
      .input(z.object({
        slug: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [post] = await db
          .select()
          .from(blogPosts)
          .where(sql`${blogPosts.slug} = ${input.slug} AND ${blogPosts.isPublished} = true`);

        if (!post) {
          throw new Error('Blog post not found');
        }

        return post;
      }),

    // Admin: List all blog posts
    listAll: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const results = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
      return results;
    }),

    // Admin: Create blog post
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(300),
        slug: z.string().min(1).max(300),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        featuredImage: z.string().url().optional(),
        authorId: z.number(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(blogPosts).values({
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt,
          content: input.content,
          featuredImage: input.featuredImage,
          authorId: input.authorId,
          isPublished: input.isPublished || false,
          publishedAt: input.isPublished ? new Date() : null,
        });

        return { success: true };
      }),

    // Admin: Update blog post
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(300).optional(),
        slug: z.string().min(1).max(300).optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        featuredImage: z.string().url().optional(),
        authorId: z.number().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...updates } = input;
        
        // If publishing for the first time, set publishedAt
        if (updates.isPublished) {
          const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
          if (post && !post.publishedAt) {
            (updates as any).publishedAt = new Date();
          }
        }

        await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id));

        return { success: true };
      }),

    // Admin: Delete blog post
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(blogPosts).where(eq(blogPosts.id, input.id));

        return { success: true };
      }),
  }),

  // ==================== About Page Routes ====================
  about: router({
    content: publicProcedure.query(async () => {
      return await getAllAboutContent();
    }),
    values: publicProcedure.query(async () => {
      return await getAllAboutValues();
    }),
    team: publicProcedure.query(async () => {
      return await getAllTeamMembers();
    }),
    awards: publicProcedure.query(async () => {
      return await getAllAwards();
    }),
  }),

  // ==================== Legal Pages Routes ====================
  legal: router({
    getByType: publicProcedure
      .input(z.object({ pageType: z.string() }))
      .query(async ({ input }) => {
        return await getLegalPageByType(input.pageType);
      }),
  }),

  // ==================== Admin: About Content Management ====================
  adminAbout: router({
    // About Content (Hero, Story sections)
    getAllContent: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db.select().from(aboutContent);
    }),
    updateContent: protectedProcedure
      .input(z.object({
        sectionKey: z.string(),
        sectionValue: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if section exists
        const existing = await db.select().from(aboutContent).where(eq(aboutContent.sectionKey, input.sectionKey)).limit(1);
        
        if (existing.length > 0) {
          // Update existing
          await db.update(aboutContent)
            .set({ sectionValue: input.sectionValue })
            .where(eq(aboutContent.sectionKey, input.sectionKey));
        } else {
          // Insert new
          await db.insert(aboutContent).values({
            sectionKey: input.sectionKey,
            sectionValue: input.sectionValue,
          });
        }

        return { success: true };
      }),

    // About Values
    getAllValues: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db.select().from(aboutValues);
    }),
    createValue: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(aboutValues).values(input);
        return { success: true };
      }),
    updateValue: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string(),
        description: z.string(),
        icon: z.string(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(aboutValues).set(data).where(eq(aboutValues.id, id));
        return { success: true };
      }),
    deleteValue: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(aboutValues).where(eq(aboutValues.id, input.id));
        return { success: true };
      }),

    // Team Members
    getAllTeam: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db.select().from(teamMembers);
    }),
    createTeamMember: protectedProcedure
      .input(z.object({
        name: z.string(),
        title: z.string(),
        bio: z.string(),
        imageUrl: z.string().optional(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(teamMembers).values(input);
        return { success: true };
      }),
    updateTeamMember: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        title: z.string(),
        bio: z.string(),
        imageUrl: z.string().optional(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
        return { success: true };
      }),
    deleteTeamMember: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(teamMembers).where(eq(teamMembers.id, input.id));
        return { success: true };
      }),

    // Awards
    getAllAwards: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db.select().from(awards);
    }),
    createAward: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        year: z.number().optional(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(awards).values(input);
        return { success: true };
      }),
    updateAward: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        year: z.number().optional(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(awards).set(data).where(eq(awards.id, id));
        return { success: true };
      }),
    deleteAward: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(awards).where(eq(awards.id, input.id));
        return { success: true };
      }),
  }),

  // ==================== Testimonials Management ====================
  testimonials: router({
    getAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonials } = await import('../drizzle/schema');
      return await db.select().from(testimonials).where(eq(testimonials.isApproved, true)).orderBy(testimonials.displayOrder, testimonials.createdAt);
    }),

    // Public submission endpoint for customers
    submit: publicProcedure
      .input(z.object({
        customerName: z.string().min(2, 'Name must be at least 2 characters'),
        customerEmail: z.string().email('Invalid email address').optional(),
        content: z.string().min(10, 'Testimonial must be at least 10 characters'),
        rating: z.number().min(1).max(5),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        
        // Insert with isApproved = false (pending admin approval)
        await db.insert(testimonials).values({
          ...input,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        });
        
        // Get the last inserted testimonial
        const inserted = await db.select()
          .from(testimonials)
          .where(eq(testimonials.customerName, input.customerName))
          .orderBy(desc(testimonials.createdAt))
          .limit(1);
        
        const insertedId = inserted[0]?.id;
        
        // Send email notification to admin
        try {
          const { sendTestimonialNotificationEmail } = await import('./email');
          await sendTestimonialNotificationEmail({
            id: Number(insertedId),
            customerName: input.customerName,
            customerEmail: input.customerEmail || null,
            content: input.content,
            rating: input.rating,
          });
        } catch (emailError) {
          console.error('[Testimonial] Failed to send notification email:', emailError);
          // Don't fail the submission if email fails
        }
        
        return { success: true, message: 'Thank you for your testimonial! It will be reviewed by our team.' };
      }),

    getFeatured: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonials } = await import('../drizzle/schema');
      return await db.select().from(testimonials)
        .where(sql`${testimonials.isApproved} = true AND ${testimonials.isFeatured} = true`)
        .orderBy(testimonials.displayOrder, testimonials.createdAt)
        .limit(6);
    }),

    getAllAdmin: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonials } = await import('../drizzle/schema');
      return await db.select().from(testimonials).orderBy(testimonials.createdAt);
    }),

    create: protectedProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string().email().optional(),
        content: z.string(),
        rating: z.number().min(1).max(5),
        isApproved: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.insert(testimonials).values(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        customerName: z.string(),
        customerEmail: z.string().email().optional(),
        content: z.string(),
        rating: z.number().min(1).max(5),
        isApproved: z.boolean(),
        isFeatured: z.boolean(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        const { id, ...data } = input;
        await db.update(testimonials).set(data).where(eq(testimonials.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.delete(testimonials).where(eq(testimonials.id, input.id));
        return { success: true };
      }),

    toggleApproval: protectedProcedure
      .input(z.object({ id: z.number(), isApproved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.update(testimonials).set({ isApproved: input.isApproved }).where(eq(testimonials.id, input.id));
        return { success: true };
      }),

    toggleFeatured: protectedProcedure
      .input(z.object({ id: z.number(), isFeatured: z.boolean() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.update(testimonials).set({ isFeatured: input.isFeatured }).where(eq(testimonials.id, input.id));
        return { success: true };
      }),

    bulkApprove: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        
        await db.update(testimonials)
          .set({ isApproved: true })
          .where(inArray(testimonials.id, input.ids));
        
        return { success: true, count: input.ids.length };
      }),

    bulkReject: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        
        // Delete rejected testimonials
        await db.delete(testimonials)
          .where(inArray(testimonials.id, input.ids));
        
        return { success: true, count: input.ids.length };
      }),

    updateResponse: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        adminResponse: z.string().min(1, 'Response cannot be empty').optional(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        
        // Get testimonial details before update
        const testimonial = await db.select()
          .from(testimonials)
          .where(eq(testimonials.id, input.id))
          .limit(1);
        
        if (testimonial.length === 0) {
          throw new Error('Testimonial not found');
        }
        
        // Update admin response and timestamp
        await db.update(testimonials)
          .set({ 
            adminResponse: input.adminResponse || null,
            adminResponseDate: input.adminResponse ? new Date() : null,
          })
          .where(eq(testimonials.id, input.id));
        
        // Send email notification to customer if response was added/updated and customer has email
        if (input.adminResponse && testimonial[0].customerEmail) {
          const { sendTestimonialResponseEmail } = await import('./email');
          await sendTestimonialResponseEmail({
            id: testimonial[0].id,
            customerName: testimonial[0].customerName,
            customerEmail: testimonial[0].customerEmail,
            content: testimonial[0].content,
            rating: testimonial[0].rating,
            adminResponse: input.adminResponse,
          });
        }
        
        return { success: true };
      }),

    // Response Templates Management
    getTemplates: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonialResponseTemplates } = await import('../drizzle/schema');
      return await db.select()
        .from(testimonialResponseTemplates)
        .where(eq(testimonialResponseTemplates.isActive, true))
        .orderBy(testimonialResponseTemplates.displayOrder);
    }),

    getAllTemplates: protectedProcedure.query(async ({ ctx }) => {      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonialResponseTemplates } = await import('../drizzle/schema');
      return await db.select()
        .from(testimonialResponseTemplates)
        .orderBy(testimonialResponseTemplates.displayOrder);
    }),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1, 'Template name is required'),
        content: z.string().min(1, 'Template content is required'),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonialResponseTemplates } = await import('../drizzle/schema');
        
        await db.insert(testimonialResponseTemplates).values(input);
        return { success: true };
      }),

    updateTemplate: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1, 'Template name is required'),
        content: z.string().min(1, 'Template content is required'),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonialResponseTemplates } = await import('../drizzle/schema');
        
        await db.update(testimonialResponseTemplates)
          .set({
            name: input.name,
            content: input.content,
            displayOrder: input.displayOrder,
            isActive: input.isActive,
          })
          .where(eq(testimonialResponseTemplates.id, input.id));
        
        return { success: true };
      }),

    deleteTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonialResponseTemplates } = await import('../drizzle/schema');
        
        await db.delete(testimonialResponseTemplates)
          .where(eq(testimonialResponseTemplates.id, input.id));
        
        return { success: true };
      }),
  }),

  // ==================== Admin User Management ====================
  adminUsers: adminUserManagementRouter,

  // ==================== Custom Roles Management ====================
  customRoles: customRolesRouter,

  // ==================== Admin: Legal Pages Management ====================
  adminLegal: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {      return await getAllLegalPages();
    }),
    update: protectedProcedure
      .input(z.object({
        pageType: z.string(),
        title: z.string(),
        content: z.string(),
        isPublished: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if page exists
        const existing = await db.select().from(legalPages).where(eq(legalPages.pageType, input.pageType)).limit(1);
        
        if (existing.length > 0) {
          // Update existing
          await db.update(legalPages)
            .set({ 
              title: input.title,
              content: input.content,
              isPublished: input.isPublished,
            })
            .where(eq(legalPages.pageType, input.pageType));
        } else {
          // Insert new
          await db.insert(legalPages).values(input);
        }

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
