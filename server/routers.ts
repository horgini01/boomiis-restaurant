import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { verifyCredentials } from "./customAuth";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { getDb, getAllMenuCategories, getMenuItemsByCategory, getFeaturedMenuItems } from "./db";
import { orders as ordersTable, orders, orderItems as orderItemsTable, menuItems, menuCategories, reservations, siteSettings, deliveryAreas, subscribers, emailCampaigns } from '../drizzle/schema';
import { eq, sql } from "drizzle-orm";
import { stripe } from "./stripe";
import { sendOrderStatusUpdateEmail, getResendClient, FROM_EMAIL, sendNewsletterConfirmationEmail, sendCampaignEmail } from "./email";
import { storagePut, storageGet } from "./storage";

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
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number(),
          price: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Check if restaurant is currently open
        const settings = await db.select().from(siteSettings);
        const openingTime = settings.find(s => s.settingKey === 'opening_time')?.settingValue || '11:00';
        const closingTime = settings.find(s => s.settingKey === 'closing_time')?.settingValue || '22:00';
        
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (currentTime < openingTime || currentTime >= closingTime) {
          throw new Error(`Sorry, we are currently closed. Our opening hours are ${openingTime} - ${closingTime}.`);
        }

        const { items: orderItems, preferredTime, ...orderData } = input;
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = input.orderType === 'delivery' ? 3.99 : 0;
        const total = subtotal + deliveryFee;
        const orderNumber = `BO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Convert preferred time (HH:MM) to timestamp for today
        let scheduledFor = null;
        if (preferredTime) {
          const [hours, minutes] = preferredTime.split(':').map(Number);
          const scheduledDate = new Date();
          scheduledDate.setHours(hours, minutes, 0, 0);
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
});

export type AppRouter = typeof appRouter;
