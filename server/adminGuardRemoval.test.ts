import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

describe("AdminGuard Removal", () => {
  it("should verify AdminGuard is not imported in any admin pages", () => {
    const adminPagesDir = "./client/src/pages/admin";
    const files = readdirSync(adminPagesDir).filter(f => f.endsWith(".tsx"));
    
    const filesWithAdminGuard: string[] = [];
    
    for (const file of files) {
      const filePath = join(adminPagesDir, file);
      const content = readFileSync(filePath, "utf-8");
      
      if (content.includes("import AdminGuard") || content.includes("from '@/components/AdminGuard'") || content.includes('from "@/components/AdminGuard"')) {
        filesWithAdminGuard.push(file);
      }
    }
    
    expect(filesWithAdminGuard).toEqual([]);
  });

  it("should verify AdminGuard component tags are not used in any admin pages", () => {
    const adminPagesDir = "./client/src/pages/admin";
    const files = readdirSync(adminPagesDir).filter(f => f.endsWith(".tsx"));
    
    const filesWithAdminGuardTags: string[] = [];
    
    for (const file of files) {
      const filePath = join(adminPagesDir, file);
      const content = readFileSync(filePath, "utf-8");
      
      if (content.includes("<AdminGuard>") || content.includes("</AdminGuard>")) {
        filesWithAdminGuardTags.push(file);
      }
    }
    
    expect(filesWithAdminGuardTags).toEqual([]);
  });

  it("should verify RoleGuard component exists for permission checks", () => {
    const roleGuardContent = readFileSync("./client/src/components/RoleGuard.tsx", "utf-8");
    
    // RoleGuard should exist and check permissions
    expect(roleGuardContent).toContain("canAccessRoute");
    expect(roleGuardContent).toContain("Access denied");
  });
});
