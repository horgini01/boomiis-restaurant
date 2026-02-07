import { describe, expect, it } from "vitest";

describe("Kitchen Staff Login and Access", () => {

  it("should verify kitchen_staff has access to dashboard route", async () => {
    const { canAccessRoute } = await import("../client/src/lib/rolePermissions");
    
    const hasAccess = canAccessRoute("kitchen_staff", "/admin/dashboard");
    expect(hasAccess).toBe(true);
  });

  it("should verify kitchen_staff has access to orders route", async () => {
    const { canAccessRoute } = await import("../client/src/lib/rolePermissions");
    
    const hasAccess = canAccessRoute("kitchen_staff", "/admin/orders");
    expect(hasAccess).toBe(true);
  });

  it("should verify kitchen_staff has access to change-password route", async () => {
    const { canAccessRoute } = await import("../client/src/lib/rolePermissions");
    
    const hasAccess = canAccessRoute("kitchen_staff", "/admin/change-password");
    expect(hasAccess).toBe(true);
  });

  it("should verify kitchen_staff does NOT have access to users route", async () => {
    const { canAccessRoute } = await import("../client/src/lib/rolePermissions");
    
    const hasAccess = canAccessRoute("kitchen_staff", "/admin/users");
    expect(hasAccess).toBe(false);
  });

  it("should verify kitchen_staff does NOT have access to settings route", async () => {
    const { canAccessRoute } = await import("../client/src/lib/rolePermissions");
    
    const hasAccess = canAccessRoute("kitchen_staff", "/admin/settings");
    expect(hasAccess).toBe(false);
  });
});
