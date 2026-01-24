import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const adminUser: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@boomiis.uk",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createNonAdminContext(): { ctx: TrpcContext } {
  const regularUser: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: regularUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Admin Dashboard", () => {
  it("should allow admin to access stats", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.stats();

    expect(result).toHaveProperty("menuItemsCount");
    expect(result).toHaveProperty("pendingOrdersCount");
    expect(result).toHaveProperty("pendingReservationsCount");
    expect(result).toHaveProperty("totalRevenue");
    expect(typeof result.menuItemsCount).toBe("number");
    expect(typeof result.totalRevenue).toBe("string");
  });

  it("should deny non-admin access to stats", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.stats()).rejects.toThrow("Unauthorized");
  });

  it("should allow admin to create category", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueSlug = `test-category-${Date.now()}`;
    const result = await caller.admin.createCategory({
      name: "Test Category",
      slug: uniqueSlug,
      description: "Test description",
      displayOrder: 10,
      isActive: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("should deny non-admin from creating category", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueSlug = `test-category-${Date.now()}`;
    await expect(
      caller.admin.createCategory({
        name: "Test Category",
        slug: uniqueSlug,
        description: "Test description",
        displayOrder: 10,
        isActive: true,
      })
    ).rejects.toThrow("Unauthorized");
  });
});

describe("Menu Management", () => {
  it("should allow admin to create menu item", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueSlug = `test-dish-${Date.now()}`;
    const result = await caller.admin.createMenuItem({
      categoryId: 1,
      name: "Test Dish",
      slug: uniqueSlug,
      description: "A delicious test dish",
      price: 12.99,
      imageUrl: "https://example.com/image.jpg",
      isVegan: false,
      isGlutenFree: false,
      isHalal: true,
      allergens: "None",
      isAvailable: true,
      isFeatured: false,
      displayOrder: 1,
    });

    expect(result).toEqual({ success: true });
  });

  it("should deny non-admin from creating menu item", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueSlug = `test-dish-${Date.now()}`;
    await expect(
      caller.admin.createMenuItem({
        categoryId: 1,
        name: "Test Dish",
        slug: uniqueSlug,
        description: "A delicious test dish",
        price: 12.99,
        imageUrl: "https://example.com/image.jpg",
        isVegan: false,
        isGlutenFree: false,
        isHalal: true,
        allergens: "None",
        isAvailable: true,
        isFeatured: false,
        displayOrder: 1,
      })
    ).rejects.toThrow("Unauthorized");
  });
});

describe("Orders Management", () => {
  it("should allow admin to get orders", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getOrders();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should deny non-admin from getting orders", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getOrders()).rejects.toThrow("Unauthorized");
  });
});

describe("Reservations Management", () => {
  it("should allow admin to get reservations", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getReservations();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should deny non-admin from getting reservations", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getReservations()).rejects.toThrow("Unauthorized");
  });
});
