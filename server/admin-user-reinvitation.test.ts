import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users as userTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function createMockContext(user: any = null): TrpcContext {
  const cookies: Record<string, { value: string; options: Record<string, unknown> }> = {};

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies[name] = { value, options };
      },
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Admin User Re-invitation", () => {
  let testOwnerId: number;

  beforeAll(async () => {
    // Get the test owner user
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const ownerUsers = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, "admin@boomiis.uk"))
      .limit(1);

    if (ownerUsers.length > 0) {
      testOwnerId = ownerUsers[0].id;
    } else {
      throw new Error("Test owner user not found");
    }
  });

  it("should reject creating user with active status", async () => {
    // Create a mock owner context
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const ownerUser = await db.select().from(userTable).where(eq(userTable.id, testOwnerId)).limit(1);
    const ctx = createMockContext(ownerUser[0]);
    const caller = appRouter.createCaller(ctx);

    // Try to create a user with an email that already exists and is active
    await expect(
      caller.adminUsers.createAdminUser({
        email: "admin@boomiis.uk", // This user already exists and is active
        firstName: "Test",
        lastName: "User",
        role: "admin",
      })
    ).rejects.toThrow("A user with this email already exists and is active");
  });

  it("should allow re-inviting inactive user with new details", async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const ownerUser = await db.select().from(userTable).where(eq(userTable.id, testOwnerId)).limit(1);
    const ctx = createMockContext(ownerUser[0]);
    const caller = appRouter.createCaller(ctx);

    const testEmail = `reinvite-test-${Date.now()}@example.com`;

    // Step 1: Create a new user
    await caller.adminUsers.createAdminUser({
      email: testEmail,
      firstName: "Original",
      lastName: "Name",
      role: "manager",
      phone: "1234567890",
    });

    // Verify user was created with inactive status
    const createdUsers = await db.select().from(userTable).where(eq(userTable.email, testEmail)).limit(1);
    expect(createdUsers.length).toBe(1);
    expect(createdUsers[0].status).toBe("inactive");
    expect(createdUsers[0].firstName).toBe("Original");
    expect(createdUsers[0].lastName).toBe("Name");
    expect(createdUsers[0].role).toBe("manager");

    // Step 2: Re-invite the same user with different details
    const result = await caller.adminUsers.createAdminUser({
      email: testEmail,
      firstName: "Updated",
      lastName: "Person",
      role: "kitchen_staff",
      phone: "9876543210",
    });

    expect(result.success).toBe(true);

    // Step 3: Verify user details were updated
    const updatedUsers = await db.select().from(userTable).where(eq(userTable.email, testEmail)).limit(1);
    expect(updatedUsers.length).toBe(1); // Still only one user with this email
    expect(updatedUsers[0].firstName).toBe("Updated");
    expect(updatedUsers[0].lastName).toBe("Person");
    expect(updatedUsers[0].name).toBe("Updated Person");
    expect(updatedUsers[0].role).toBe("kitchen_staff");
    expect(updatedUsers[0].phone).toBe("9876543210");
    expect(updatedUsers[0].status).toBe("inactive"); // Still inactive until they accept invitation

    // Cleanup
    await db.delete(userTable).where(eq(userTable.email, testEmail));
  });

  it("should generate new password when re-inviting user", async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const ownerUser = await db.select().from(userTable).where(eq(userTable.id, testOwnerId)).limit(1);
    const ctx = createMockContext(ownerUser[0]);
    const caller = appRouter.createCaller(ctx);

    const testEmail = `password-test-${Date.now()}@example.com`;

    // Create user
    await caller.adminUsers.createAdminUser({
      email: testEmail,
      firstName: "Password",
      lastName: "Test",
      role: "admin",
    });

    const firstUser = await db.select().from(userTable).where(eq(userTable.email, testEmail)).limit(1);
    const firstPassword = firstUser[0].password;

    expect(firstPassword).toBeDefined();
    expect(firstPassword).not.toBeNull();

    // Re-invite user
    await caller.adminUsers.createAdminUser({
      email: testEmail,
      firstName: "Password",
      lastName: "Updated",
      role: "admin",
    });

    const secondUser = await db.select().from(userTable).where(eq(userTable.email, testEmail)).limit(1);
    const secondPassword = secondUser[0].password;

    // Password should be updated (different hash)
    expect(secondPassword).toBeDefined();
    expect(secondPassword).not.toBeNull();
    expect(secondPassword).not.toBe(firstPassword); // New password generated

    // Cleanup
    await db.delete(userTable).where(eq(userTable.email, testEmail));
  });
});
