import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Hardcoded Role Checks Removal", () => {
  it("should verify routers.ts has no hardcoded role checks", () => {
    const routersContent = readFileSync("./server/routers.ts", "utf-8");
    
    // Should NOT contain hardcoded role arrays
    expect(routersContent).not.toContain("['admin', 'owner', 'manager']");
    expect(routersContent).not.toContain('["admin", "owner", "manager"]');
    
    // Should NOT contain role check patterns
    expect(routersContent).not.toMatch(/if \(!?\['admin', 'owner', 'manager'\]\.includes\(ctx\.user/);
  });

  it("should verify systemRouter.ts uses protectedProcedure not adminProcedure", () => {
    const systemRouterContent = readFileSync("./server/_core/systemRouter.ts", "utf-8");
    
    // Should import protectedProcedure
    expect(systemRouterContent).toContain("import { protectedProcedure");
    
    // Should NOT import adminProcedure
    expect(systemRouterContent).not.toContain("adminProcedure");
    
    // notifyOwner should use protectedProcedure
    expect(systemRouterContent).toContain("notifyOwner: protectedProcedure");
  });

  it("should verify AdminGuard only checks authentication not roles", () => {
    const adminGuardContent = readFileSync("./client/src/components/AdminGuard.tsx", "utf-8");
    
    // Should NOT contain hardcoded role checks
    expect(adminGuardContent).not.toContain("['admin', 'owner', 'manager']");
    expect(adminGuardContent).not.toContain('["admin", "owner", "manager"]');
    
    // Should contain comment about RoleGuard
    expect(adminGuardContent).toContain("Role-based access control is handled by RoleGuard");
    
    // Should only check if user exists
    expect(adminGuardContent).toContain("if (!loading && !user)");
    expect(adminGuardContent).toContain("if (!user)");
  });

  it("should verify permission model uses rolePermissions.ts", () => {
    const rolePermissionsContent = readFileSync("./client/src/lib/rolePermissions.ts", "utf-8");
    
    // Should export rolePermissions object
    expect(rolePermissionsContent).toContain("export const rolePermissions");
    
    // Should define permissions for all roles
    expect(rolePermissionsContent).toContain("owner:");
    expect(rolePermissionsContent).toContain("admin:");
    expect(rolePermissionsContent).toContain("manager:");
    expect(rolePermissionsContent).toContain("kitchen_staff:");
    expect(rolePermissionsContent).toContain("front_desk:");
  });

  it("should verify RoleGuard uses rolePermissions for access control", () => {
    const roleGuardContent = readFileSync("./client/src/components/RoleGuard.tsx", "utf-8");
    
    // Should import from rolePermissions module
    expect(roleGuardContent).toContain("from \"@/lib/rolePermissions\"");
    
    // Should use canAccessRoute function for checking access
    expect(roleGuardContent).toContain("canAccessRoute");
  });
});
