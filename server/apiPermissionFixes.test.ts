import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("API Permission Fixes", () => {
  it("should verify RoleGuard only fetches custom roles for authorized users", () => {
    const roleGuardContent = readFileSync("./client/src/components/RoleGuard.tsx", "utf-8");
    
    // Check that custom roles query has enabled condition
    expect(roleGuardContent).toContain("canManageCustomRoles");
    expect(roleGuardContent).toContain("['owner', 'admin', 'manager'].includes(user.role)");
    expect(roleGuardContent).toContain("enabled: canManageCustomRoles");
  });

  it("should verify Dashboard only fetches stats for authorized users", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Check that stats queries have enabled condition
    expect(dashboardContent).toContain("canViewStats");
    expect(dashboardContent).toContain("['owner', 'admin', 'manager'].includes(user.role)");
    expect(dashboardContent).toContain("enabled: !!canViewStats");
  });

  it("should verify statsWithTrends query is conditional", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Check that statsWithTrends has enabled option
    expect(dashboardContent).toContain("trpc.admin.statsWithTrends.useQuery(undefined, {");
    expect(dashboardContent).toContain("enabled: !!canViewStats");
  });

  it("should verify todaySnapshot query is conditional", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Check that todaySnapshot has enabled option
    expect(dashboardContent).toContain("trpc.admin.todaySnapshot.useQuery(undefined, {");
    expect(dashboardContent).toContain("enabled: !!canViewStats");
  });

  it("should verify alerts query is conditional", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Check that alerts has enabled option
    expect(dashboardContent).toContain("trpc.admin.alerts.useQuery(undefined, {");
    expect(dashboardContent).toContain("enabled: !!canViewStats");
  });

  it("should verify recentActivity query is conditional", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Check that recentActivity has enabled option
    expect(dashboardContent).toContain("trpc.admin.recentActivity.useQuery(undefined, {");
    expect(dashboardContent).toContain("enabled: !!canViewStats");
  });
});
