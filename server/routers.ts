import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { verifyCredentials } from "./customAuth";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { getDb, getAllMenuCategories, getMenuItemsByCategory, getFeaturedMenuItems } from "./db";
import { subscribers, orders, orderItems as orderItemsTable, menuItems, reservations, menuCategories } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

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
      .input(z.object({ email: z.string().email(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.insert(subscribers).values({
          email: input.email,
          name: input.name || null,
        });

        return { success: true };
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
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number(),
          price: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { items: orderItems, ...orderData } = input;
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = input.orderType === 'delivery' ? 3.99 : 0;
        const total = subtotal + deliveryFee;
        const orderNumber = `BO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const [result] = await db.insert(orders).values({
          orderNumber,
          ...orderData,
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

    getOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const ordersResult = await db.select().from(orders);
      return ordersResult;
    }),

    updateOrderStatus: protectedProcedure
      .input(z.object({ orderId: z.number(), status: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.update(orders).set({ status: input.status as any }).where(eq(orders.id, input.orderId));
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
  }),
});

export type AppRouter = typeof appRouter;
