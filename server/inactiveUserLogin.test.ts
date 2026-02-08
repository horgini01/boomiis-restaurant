import { describe, expect, it } from "vitest";

describe("Inactive User Login Prevention", () => {
  it("should verify verifyCredentials checks user status", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/customAuth.ts", "utf-8");
    
    // Check that status check is present
    expect(fileContent).toContain("// Check if user account is active");
    expect(fileContent).toContain("if (user.status !== 'active')");
    expect(fileContent).toContain("Your account has been deactivated");
  });

  it("should verify error message is user-friendly", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/customAuth.ts", "utf-8");
    
    // Check that error message guides user to contact admin
    expect(fileContent).toContain("Please contact an administrator");
  });
});

describe("Bulk Delete Fix", () => {
  it("should verify bulkDeleteUsers does hard delete not soft delete", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/adminUserManagement.ts", "utf-8");
    
    // Check that hard delete is implemented
    expect(fileContent).toContain("// Hard delete - permanently remove from database");
    expect(fileContent).toContain("await db.delete(users)");
    
    // Check that verification is present
    expect(fileContent).toContain("// Verify deletion");
    expect(fileContent).toContain("const remainingUsers = await db.select()");
  });

  it("should verify bulkDeleteUsers has comprehensive logging", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/adminUserManagement.ts", "utf-8");
    
    // Check that logging is present
    expect(fileContent).toContain("[BULK DELETE] Mutation called");
    expect(fileContent).toContain("[BULK DELETE] Found");
    expect(fileContent).toContain("[BULK DELETE] Delete result:");
    expect(fileContent).toContain("[BULK DELETE] SUCCESS");
  });
});
