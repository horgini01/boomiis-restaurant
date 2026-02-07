import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Admin User Management", () => {
  let testUserId: number;
  const testEmail = `test-admin-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create a test admin user
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(users).values({
      email: testEmail,
      openId: `test-openid-${Date.now()}`,
      name: "Test Admin",
      firstName: "Test",
      lastName: "Admin",
      loginMethod: "google",
      role: "admin",
      status: "active",
    });

    // Query the user to get the ID
    const [createdUser] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
    testUserId = createdUser.id;
  });

  afterAll(async () => {
    // Clean up test user
    const db = await getDb();
    if (!db) return;

    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("User Creation", () => {
    it("should create a new admin user with OAuth authentication", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      
      expect(user).toHaveLength(1);
      expect(user[0].email).toBe(testEmail);
      expect(user[0].firstName).toBe("Test");
      expect(user[0].lastName).toBe("Admin");
      expect(user[0].role).toBe("admin");
      expect(user[0].status).toBe("active");
      expect(user[0].loginMethod).toBe("google");
      expect(user[0].openId).toBeTruthy();
    });
  });

  describe("User Roles", () => {
    it("should support all defined roles", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const roles = ["owner", "admin", "manager", "kitchen_staff", "front_desk"];
      
      for (const role of roles) {
        const testRoleEmail = `test-${role}-${Date.now()}@example.com`;
        
        await db.insert(users).values({
          email: testRoleEmail,
          openId: `test-${role}-${Date.now()}`,
          name: `Test ${role}`,
          loginMethod: "google",
          role: role as any,
          status: "active",
        });

        const [insertedUser] = await db.select().from(users).where(eq(users.email, testRoleEmail)).limit(1);
        expect(insertedUser.role).toBe(role);

        // Clean up
        await db.delete(users).where(eq(users.id, insertedUser.id));
      }
    });
  });

  describe("User Status", () => {
    it("should allow status changes between active and inactive", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update to inactive
      await db.update(users)
        .set({ status: "inactive" })
        .where(eq(users.id, testUserId));

      let user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      expect(user[0].status).toBe("inactive");

      // Update back to active
      await db.update(users)
        .set({ status: "active" })
        .where(eq(users.id, testUserId));

      user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      expect(user[0].status).toBe("active");
    });
  });

  describe("User Updates", () => {
    it("should update user profile fields", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(users)
        .set({
          firstName: "Updated",
          lastName: "Name",
          phone: "+1234567890",
        })
        .where(eq(users.id, testUserId));

      const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      
      expect(user[0].firstName).toBe("Updated");
      expect(user[0].lastName).toBe("Name");
      expect(user[0].phone).toBe("+1234567890");
    });

    it("should update user role", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(users)
        .set({ role: "manager" })
        .where(eq(users.id, testUserId));

      const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      expect(user[0].role).toBe("manager");

      // Restore original role
      await db.update(users)
        .set({ role: "admin" })
        .where(eq(users.id, testUserId));
    });
  });

  describe("User Deletion", () => {
    it("should soft delete user by setting status to inactive", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create a temporary user for deletion test
      const tempEmail = `temp-delete-${Date.now()}@example.com`;
      
      await db.insert(users).values({
        email: tempEmail,
        openId: `temp-${Date.now()}`,
        name: "Temp User",
        loginMethod: "google",
        role: "admin",
        status: "active",
      });

      const [tempUser] = await db.select().from(users).where(eq(users.email, tempEmail)).limit(1);

      // Soft delete by setting status to inactive
      await db.update(users)
        .set({ status: "inactive" })
        .where(eq(users.id, tempUser.id));

      const [deletedUser] = await db.select().from(users).where(eq(users.id, tempUser.id)).limit(1);
      expect(deletedUser.status).toBe("inactive");

      // Clean up
      await db.delete(users).where(eq(users.id, tempUser.id));
    });
  });

  describe("User Queries", () => {
    it("should filter users by role", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));
      
      expect(adminUsers.length).toBeGreaterThan(0);
      adminUsers.forEach(user => {
        expect(user.role).toBe("admin");
      });
    });

    it("should filter users by status", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const activeUsers = await db.select().from(users).where(eq(users.status, "active"));
      
      expect(activeUsers.length).toBeGreaterThan(0);
      activeUsers.forEach(user => {
        expect(user.status).toBe("active");
      });
    });
  });
});
