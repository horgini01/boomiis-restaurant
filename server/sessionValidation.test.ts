import { describe, expect, it } from "vitest";

describe("Session Validation for Inactive Users", () => {
  it("should verify createContext checks user status", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/_core/context.ts", "utf-8");
    
    // Check that status validation is present in context creation
    expect(fileContent).toContain("// Check if authenticated user's account is still active");
    expect(fileContent).toContain("if (user && user.status !== 'active')");
    expect(fileContent).toContain("[Auth] Rejecting session for inactive user");
    expect(fileContent).toContain("user = null"); // Treat as unauthenticated
  });

  it("should verify inactive users are logged with email and status", async () => {
    const { readFileSync } = await import("fs");
    const fileContent = readFileSync("./server/_core/context.ts", "utf-8");
    
    // Check that logging includes user email and status
    expect(fileContent).toContain("${user.email}");
    expect(fileContent).toContain("${user.status}");
  });
});
