import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { verifyCredentials } from "./customAuth";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { getDb, getAllMenuCategories, getMenuItemsByCategory, getFeaturedMenuItems, getChefSpecialItems, getMenuItemById, getAllSmsTemplates, getSmsTemplateById, getAllOpeningHours, getOpeningHoursByDay, getAllAboutContent, getAllAboutValues, getAllTeamMembers, getAllAwards, getLegalPageByType, getAllLegalPages } from "./db";
import { orders as ordersTable, orders, orderItems as orderItemsTable, menuItems, menuCategories, reservations, eventInquiries, siteSettings, deliveryAreas, subscribers, emailCampaigns, smsTemplates, openingHours, menuItemReviews, galleryImages, blogPosts, aboutContent, aboutValues, teamMembers, awards, legalPages } from '../drizzle/schema';
import { eq, sql, desc, and } from "drizzle-orm";
import { stripe } from "./stripe";
import { sendOrderStatusUpdateEmail, getResendClient, FROM_EMAIL, sendNewsletterConfirmationEmail, sendCampaignEmail } from "./email";
import { sendOrderReadyForPickupSMS, sendOrderOutForDeliverySMS, sendOrderStatusSMS, formatPhoneNumberE164 } from "./services/sms.service";
import { storagePut, storageGet } from "./storage";
import { optimizeAndUploadImage } from "./imageOptimization";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await verifyCredentials(input.email, input.password);
        
        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (user.role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }

        // Create session token
        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
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
  }),

  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ 
        email: z.string().email(), 
        name: z.string().optional(),
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

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error('Admin access required');
        }

        const { storagePut } = await import('./storage');
        
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
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
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

    createCategory: protectedProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        displayOrder: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
        return { success: true };
      }),

    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(menuCategories).where(eq(menuCategories.id, input.id));
        return { success: true };
      }),

    toggleCategoryActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuCategories).set({ isActive: input.isActive }).where(eq(menuCategories.id, input.id));
        return { success: true };
      }),

    bulkUpdateCategories: protectedProcedure
      .input(z.object({
        categoryIds: z.array(z.number()),
        operation: z.enum(['activate', 'deactivate', 'delete']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        try {
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(menuItems).values({
          ...input,
          price: input.price.toString(),
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(menuItems).set({
          ...data,
          price: data.price.toString(),
        }).where(eq(menuItems.id, id));
        return { success: true };
      }),

    deleteMenuItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(menuItems).where(eq(menuItems.id, input.id));
        return { success: true };
      }),

    bulkUpdatePrices: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        priceChange: z.number(), // percentage change, e.g., 10 for 10% increase, -5 for 5% decrease
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error('Admin access required');
        }

        const { itemIds, priceChange } = input;
        
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error('Admin access required');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error('Admin access required');
        }

        const db = await getDb();
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
      .query(async ({ ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error('Admin access required');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        return await db.select().from(menuItems).orderBy(menuItems.displayOrder);
      }),

    toggleMenuItemAvailable: protectedProcedure
      .input(z.object({ id: z.number(), isAvailable: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuItems).set({ isAvailable: input.isAvailable }).where(eq(menuItems.id, input.id));
        return { success: true };
      }),

    toggleMenuItemStock: protectedProcedure
      .input(z.object({ id: z.number(), outOfStock: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(menuItems).set({ outOfStock: input.outOfStock }).where(eq(menuItems.id, input.id));
        return { success: true };
      }),

    bulkUpdateMenuItems: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()),
        operation: z.enum(['priceChange', 'makeAvailable', 'makeUnavailable', 'markInStock', 'markOutOfStock', 'delete']),
        priceChangePercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
            await db.delete(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
            break;
        }

        return { success: true, updatedCount: itemIds.length };
      }),

    getOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
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

    getCompletedOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();  
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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

        return { success: true };
      }),

    getReservations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const reservationsResult = await db.select().from(reservations);
      return reservationsResult;
    }),

    updateReservationStatus: protectedProcedure
      .input(z.object({ reservationId: z.number(), status: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(reservations).set({ status: input.status as any }).where(eq(reservations.id, input.reservationId));
        return { success: true };
      }),

    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const settings = await db.select().from(siteSettings);
        return settings;
      }),

    updateSetting: protectedProcedure
      .input(z.object({ settingKey: z.string(), settingValue: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if setting exists
        const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, input.settingKey)).limit(1);

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

        return { success: true };
      }),

    uploadLogo: protectedProcedure
      .input(z.object({ 
        fileData: z.string(), // base64 encoded image
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const { generateEmailPreviews } = await import('./email');
        const previews = await generateEmailPreviews();
        
        return { html: previews[input.templateType] };
      }),

    getEmailTemplates: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const { generateEmailPreviews } = await import('./email');
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        if (input.id) {
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

        return { success: true };
      }),

    deleteDeliveryArea: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(deliveryAreas).where(eq(deliveryAreas.id, input.id));

        return { success: true };
      }),

    downloadReceipt: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
        orderId: z.number(),
        customerEmail: z.string().email(),
        customerName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get order details
        const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) {
          throw new Error('Order not found');
        }

        // Get order items
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));

        // Create Stripe checkout session
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: items.map(item => ({
            price_data: {
              currency: 'gbp',
              product_data: {
                name: item.menuItemName,
              },
              unit_amount: Math.round(parseFloat(item.price) * 100), // Convert to pence
            },
            quantity: item.quantity,
          })),
          // Add delivery fee if applicable
          ...(parseFloat(order.deliveryFee) > 0 ? {
            line_items: [
              ...items.map(item => ({
                price_data: {
                  currency: 'gbp',
                  product_data: {
                    name: item.menuItemName,
                  },
                  unit_amount: Math.round(parseFloat(item.price) * 100),
                },
                quantity: item.quantity,
              })),
              {
                price_data: {
                  currency: 'gbp',
                  product_data: {
                    name: 'Delivery Fee',
                  },
                  unit_amount: Math.round(parseFloat(order.deliveryFee) * 100),
                },
                quantity: 1,
              },
            ],
          } : {}),
          mode: 'payment',
          success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/checkout?cancelled=true`,
          customer_email: input.customerEmail,
          client_reference_id: input.orderId.toString(),
          metadata: {
            orderId: input.orderId.toString(),
            customerEmail: input.customerEmail,
            customerName: input.customerName,
          },
          allow_promotion_codes: true,
          payment_intent_data: {
            metadata: {
              orderId: input.orderId.toString(),
            },
          },
        });

        // Update order with payment intent ID
        await db.update(orders)
          .set({ paymentIntentId: session.payment_intent as string })
          .where(eq(orders.id, input.orderId));

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

          const orderId = parseInt(session.client_reference_id || '0');
          if (orderId) {
            // Get payment intent ID
            const paymentIntentId = typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent?.id;

            // Update order with payment info
            await db.update(orders)
              .set({ 
                paymentStatus: 'paid', 
                status: 'confirmed',
                paymentIntentId: paymentIntentId || null,
              })
              .where(eq(orders.id, orderId));

            // Fetch complete order details for email
            const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
            const items = await db.select({
              name: orderItemsTable.menuItemName,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              subtotal: orderItemsTable.subtotal,
            }).from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

            if (order) {
              // Send confirmation emails
              const { sendOrderConfirmationEmail, sendAdminOrderNotification } = await import('./email');
              
              try {
                await sendOrderConfirmationEmail({
                  customerEmail: order.customerEmail,
                  customerName: order.customerName,
                  customerPhone: order.customerPhone,
                  orderNumber: order.orderNumber,
                  orderType: order.orderType,
                  scheduledFor: order.scheduledFor || undefined,
                  items: items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                  })),
                  subtotal: parseFloat(order.subtotal),
                  deliveryFee: parseFloat(order.deliveryFee),
                  total: parseFloat(order.total),
                  deliveryAddress: order.deliveryAddress || undefined,
                  deliveryPostcode: order.deliveryPostcode || undefined,
                  specialInstructions: order.specialInstructions || undefined,
                });
                console.log('[Payment] Order confirmation email sent');
              } catch (error) {
                console.error('[Payment] Failed to send order confirmation:', error);
              }

              try {
                await sendAdminOrderNotification({
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  customerEmail: order.customerEmail,
                  customerPhone: order.customerPhone,
                  orderType: order.orderType,
                  subtotal: parseFloat(order.subtotal),
                  deliveryFee: parseFloat(order.deliveryFee),
                  total: parseFloat(order.total),
                  items: items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                  })),
                  deliveryAddress: order.deliveryAddress || undefined,
                  deliveryPostcode: order.deliveryPostcode || undefined,
                  specialInstructions: order.specialInstructions || undefined,
                });
                console.log('[Payment] Admin notification email sent');
              } catch (error) {
                console.error('[Payment] Failed to send admin notification:', error);
              }

              // Send SMS notification to customer
              try {
                if (order.customerPhone) {
                  const { sendOrderStatusSMS } = await import('./services/sms.service');
                  console.log(`[Payment] Sending SMS to ${order.customerPhone}`);
                  await sendOrderStatusSMS(
                    order.customerName,
                    order.customerPhone,
                    order.orderNumber,
                    'order_confirmed',
                    30, // estimated minutes
                    order.smsOptIn ?? true // Customer's SMS preference (default true for existing orders)
                  );
                  console.log('[Payment] SMS notification sent');
                } else {
                  console.log('[Payment] No customer phone, skipping SMS');
                }
              } catch (error) {
                console.error('[Payment] Failed to send SMS notification:', error);
              }
            }
          }
        }

        return {
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
        };
      }),
  }),

  // Newsletter management endpoints
  subscribers: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const allSubscribers = await db.select().from(subscribers).orderBy(sql`${subscribers.subscribedAt} DESC`);
      return allSubscribers;
    }),

    unsubscribe: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(subscribers)
          .set({ isActive: false, unsubscribedAt: new Date() })
          .where(eq(subscribers.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(subscribers).where(eq(subscribers.id, input.id));
        return { success: true };
      }),
  }),

  // Email campaigns endpoints
  campaigns: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(emailCampaigns).where(eq(emailCampaigns.id, input.id));
        return { success: true };
      }),
  }),

  smsTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const templates = await getAllSmsTemplates();
      return templates;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const template = await getSmsTemplateById(input.id);
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get template
        const template = await getSmsTemplateById(input.templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        // Format phone number
        const formattedPhone = formatPhoneNumberE164(input.phoneNumber);

        // Send test SMS with sample data
        await sendOrderStatusSMS(
          'Test User', // customerName
          formattedPhone,
          'TEST-12345', // orderNumber
          template.templateType,
          30, // estimatedMinutes
          true // smsOptIn (always true for test)
        );

        return { success: true };
      }),
  }),

  openingHours: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const hours = await getAllOpeningHours();
      return hours;
    }),

    getByDay: protectedProcedure
      .input(z.object({ dayOfWeek: z.number().min(0).max(6) }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const hours = await getOpeningHoursByDay(input.dayOfWeek);
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(['new', 'contacted', 'quoted', 'booked', 'cancelled']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
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
    getAllContent: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db.select().from(aboutContent);
    }),
    updateContent: protectedProcedure
      .input(z.object({
        sectionKey: z.string(),
        sectionValue: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
    getAllValues: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(aboutValues).set(data).where(eq(aboutValues.id, id));
        return { success: true };
      }),
    deleteValue: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(aboutValues).where(eq(aboutValues.id, input.id));
        return { success: true };
      }),

    // Team Members
    getAllTeam: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
        return { success: true };
      }),
    deleteTeamMember: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(teamMembers).where(eq(teamMembers.id, input.id));
        return { success: true };
      }),

    // Awards
    getAllAwards: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...data } = input;
        await db.update(awards).set(data).where(eq(awards.id, id));
        return { success: true };
      }),
    deleteAward: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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

    getFeatured: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { testimonials } = await import('../drizzle/schema');
      return await db.select().from(testimonials)
        .where(sql`${testimonials.isApproved} = true AND ${testimonials.isFeatured} = true`)
        .orderBy(testimonials.displayOrder, testimonials.createdAt)
        .limit(6);
    }),

    getAllAdmin: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        const { id, ...data } = input;
        await db.update(testimonials).set(data).where(eq(testimonials.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.delete(testimonials).where(eq(testimonials.id, input.id));
        return { success: true };
      }),

    toggleApproval: protectedProcedure
      .input(z.object({ id: z.number(), isApproved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.update(testimonials).set({ isApproved: input.isApproved }).where(eq(testimonials.id, input.id));
        return { success: true };
      }),

    toggleFeatured: protectedProcedure
      .input(z.object({ id: z.number(), isFeatured: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { testimonials } = await import('../drizzle/schema');
        await db.update(testimonials).set({ isFeatured: input.isFeatured }).where(eq(testimonials.id, input.id));
        return { success: true };
      }),
  }),

  // ==================== Admin: Legal Pages Management ====================
  adminLegal: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      return await getAllLegalPages();
    }),
    update: protectedProcedure
      .input(z.object({
        pageType: z.string(),
        title: z.string(),
        content: z.string(),
        isPublished: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
        const db = await getDb();
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
