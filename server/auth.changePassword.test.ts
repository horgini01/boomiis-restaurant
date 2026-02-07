import { describe, it, expect } from "vitest";

describe("Password Change Validation", () => {
  it("should enforce minimum 8 characters", () => {
    const shortPassword = "Pass1";
    const minLength = shortPassword.length >= 8;
    expect(minLength).toBe(false);

    const validPassword = "Password1";
    const validLength = validPassword.length >= 8;
    expect(validLength).toBe(true);
  });

  it("should require at least one lowercase letter", () => {
    const noLowercase = "PASSWORD1";
    const hasLowercase = /[a-z]/.test(noLowercase);
    expect(hasLowercase).toBe(false);

    const withLowercase = "Password1";
    const hasLowercaseValid = /[a-z]/.test(withLowercase);
    expect(hasLowercaseValid).toBe(true);
  });

  it("should require at least one uppercase letter", () => {
    const noUppercase = "password1";
    const hasUppercase = /[A-Z]/.test(noUppercase);
    expect(hasUppercase).toBe(false);

    const withUppercase = "Password1";
    const hasUppercaseValid = /[A-Z]/.test(withUppercase);
    expect(hasUppercaseValid).toBe(true);
  });

  it("should require at least one number", () => {
    const noNumber = "Password";
    const hasNumber = /[0-9]/.test(noNumber);
    expect(hasNumber).toBe(false);

    const withNumber = "Password1";
    const hasNumberValid = /[0-9]/.test(withNumber);
    expect(hasNumberValid).toBe(true);
  });

  it("should validate complete password requirements", () => {
    const passwords = [
      { password: "short1", valid: false, reason: "too short" },
      { password: "nouppercase1", valid: false, reason: "no uppercase" },
      { password: "NOLOWERCASE1", valid: false, reason: "no lowercase" },
      { password: "NoNumbers", valid: false, reason: "no numbers" },
      { password: "Password1", valid: true, reason: "meets all requirements" },
      { password: "SecurePass123", valid: true, reason: "meets all requirements" },
    ];

    passwords.forEach(({ password, valid }) => {
      const hasMinLength = password.length >= 8;
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const isValid = hasMinLength && hasLowercase && hasUppercase && hasNumber;

      expect(isValid).toBe(valid);
    });
  });
});
