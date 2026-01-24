import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb, getAllMenuCategories, getMenuItemsByCategory, getFeaturedMenuItems } from "./db";
import { subscribers, orders, orderItems as orderItemsTable, menuItems, reservations, menuCategories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
