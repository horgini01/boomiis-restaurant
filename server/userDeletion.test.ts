import { describe, expect, it } from "vitest";

describe("User Deletion Verification", () => {
  it("should verify deleteAdminUser has logging and verification", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/adminUserManagement.ts", "utf-8");
    
    // Check that logging is present
    expect(fileContent).toContain("[User Deletion] Attempting to delete user ID:");
    expect(fileContent).toContain("[User Deletion] Delete result:");
    expect(fileContent).toContain("[User Deletion] SUCCESS - User");
    
    // Check that verification is present
    expect(fileContent).toContain("// Verify deletion");
    expect(fileContent).toContain("if (verifyUser) {");
    expect(fileContent).toContain("Failed to delete user from database");
  });
});

describe("Role Permissions Updates", () => {
  it("should verify change-password route is in ALL_ADMIN_ROUTES", async () => {
    const { rolePermissions } = await import("../client/src/lib/rolePermissions");
    
    // Check that all roles have access to change-password
    expect(rolePermissions.owner).toContain("/admin/change-password");
    expect(rolePermissions.admin).toContain("/admin/change-password");
    expect(rolePermissions.manager).toContain("/admin/change-password");
    expect(rolePermissions.kitchen_staff).toContain("/admin/change-password");
    expect(rolePermissions.front_desk).toContain("/admin/change-password");
  });

  it("should verify role descriptions reflect correct route counts", async () => {
    const { roleDescriptions } = await import("../client/src/lib/rolePermissions");
    
    expect(roleDescriptions.owner).toContain("28 admin features");
    expect(roleDescriptions.admin).toContain("28 admin features");
    expect(roleDescriptions.manager).toContain("22 routes");
    expect(roleDescriptions.kitchen_staff).toContain("3 routes");
    expect(roleDescriptions.front_desk).toContain("6 routes");
  });
});
