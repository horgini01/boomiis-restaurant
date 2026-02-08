import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Admin Login Password Toggle", () => {
  it("should verify Admin Login page has Eye and EyeOff icons imported", () => {
    const loginContent = readFileSync("./client/src/pages/admin/Login.tsx", "utf-8");
    
    // Should import Eye and EyeOff icons
    expect(loginContent).toContain("Eye");
    expect(loginContent).toContain("EyeOff");
    expect(loginContent).toContain("from 'lucide-react'");
  });

  it("should verify Admin Login page has showPassword state", () => {
    const loginContent = readFileSync("./client/src/pages/admin/Login.tsx", "utf-8");
    
    // Should have showPassword state
    expect(loginContent).toContain("showPassword");
    expect(loginContent).toContain("setShowPassword");
    expect(loginContent).toContain("useState(false)");
  });

  it("should verify password input type switches based on showPassword state", () => {
    const loginContent = readFileSync("./client/src/pages/admin/Login.tsx", "utf-8");
    
    // Password input should use conditional type
    expect(loginContent).toContain('type={showPassword ? "text" : "password"}');
  });

  it("should verify toggle button exists with correct functionality", () => {
    const loginContent = readFileSync("./client/src/pages/admin/Login.tsx", "utf-8");
    
    // Should have toggle button
    expect(loginContent).toContain("onClick={() => setShowPassword(!showPassword)}");
    expect(loginContent).toContain("{showPassword ? <EyeOff");
    expect(loginContent).toContain(": <Eye");
  });

  it("should verify password field has relative positioning for icon", () => {
    const loginContent = readFileSync("./client/src/pages/admin/Login.tsx", "utf-8");
    
    // Should wrap input in relative div
    expect(loginContent).toContain('className="relative"');
    expect(loginContent).toContain('className="pr-10"'); // Padding for icon space
  });
});
