import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Custom Roles Procedure Fix", () => {
  it("should verify getAllCustomRoles uses protectedProcedure not adminOrOwnerProcedure", () => {
    const customRolesContent = readFileSync("./server/customRoles.ts", "utf-8");
    
    // Should use protectedProcedure for getAllCustomRoles
    expect(customRolesContent).toContain("getAllCustomRoles: protectedProcedure.query");
    
    // Should NOT use adminOrOwnerProcedure for getAllCustomRoles
    expect(customRolesContent).not.toContain("getAllCustomRoles: adminOrOwnerProcedure");
  });

  it("should verify adminOrOwnerProcedure still exists for other procedures", () => {
    const customRolesContent = readFileSync("./server/customRoles.ts", "utf-8");
    
    // adminOrOwnerProcedure should still exist for create/update/delete operations
    expect(customRolesContent).toContain("const adminOrOwnerProcedure");
    
    // Should be used for createCustomRole
    expect(customRolesContent).toContain("createCustomRole: adminOrOwnerProcedure");
    
    // Should be used for updateCustomRole
    expect(customRolesContent).toContain("updateCustomRole: adminOrOwnerProcedure");
    
    // Should be used for deleteCustomRole
    expect(customRolesContent).toContain("deleteCustomRole: adminOrOwnerProcedure");
  });

  it("should verify ownerProcedure is used for getCustomRoleById", () => {
    const customRolesContent = readFileSync("./server/customRoles.ts", "utf-8");
    
    // Should use ownerProcedure for getCustomRoleById
    expect(customRolesContent).toContain("getCustomRoleById: ownerProcedure");
  });
});
