import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("ChangePassword Page Fix", () => {
  it("should verify ChangePassword page does not check loginMethod", () => {
    const changePasswordContent = readFileSync("./client/src/pages/admin/ChangePassword.tsx", "utf-8");
    
    // Should NOT have isPasswordAccount check
    expect(changePasswordContent).not.toContain("const isPasswordAccount");
    expect(changePasswordContent).not.toContain("user?.loginMethod === \"password\"");
    
    // Should NOT have conditional rendering based on loginMethod
    expect(changePasswordContent).not.toContain("!isPasswordAccount");
    expect(changePasswordContent).not.toContain("Your account uses");
    expect(changePasswordContent).not.toContain("email authentication");
  });

  it("should verify ChangePassword form is always rendered", () => {
    const changePasswordContent = readFileSync("./client/src/pages/admin/ChangePassword.tsx", "utf-8");
    
    // Should have the password change form
    expect(changePasswordContent).toContain("Update Password");
    expect(changePasswordContent).toContain("Current Password");
    expect(changePasswordContent).toContain("New Password");
    expect(changePasswordContent).toContain("Confirm New Password");
    expect(changePasswordContent).toContain("Change Password");
  });

  it("should verify password validation requirements exist", () => {
    const changePasswordContent = readFileSync("./client/src/pages/admin/ChangePassword.tsx", "utf-8");
    
    // Should have password strength validation
    expect(changePasswordContent).toContain("hasMinLength");
    expect(changePasswordContent).toContain("hasLowercase");
    expect(changePasswordContent).toContain("hasUppercase");
    expect(changePasswordContent).toContain("hasNumber");
    expect(changePasswordContent).toContain("At least 8 characters");
  });
});
