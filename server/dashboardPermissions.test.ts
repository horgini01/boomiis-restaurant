import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Dashboard Permissions - Route-Level Only", () => {
  it("should verify todaySnapshot has no role check", () => {
    const routersContent = readFileSync("./server/routers.ts", "utf-8");
    
    // Find the todaySnapshot procedure
    const todaySnapshotMatch = routersContent.match(/todaySnapshot: protectedProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]{0,200}/);
    expect(todaySnapshotMatch).toBeTruthy();
    
    // Should NOT contain role check
    const procedureContent = todaySnapshotMatch![0];
    expect(procedureContent).not.toContain("if (!['admin', 'owner', 'manager'].includes(ctx.user.role))");
    expect(procedureContent).not.toContain("throw new Error('Unauthorized')");
  });

  it("should verify alerts has no role check", () => {
    const routersContent = readFileSync("./server/routers.ts", "utf-8");
    
    const alertsMatch = routersContent.match(/alerts: protectedProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]{0,200}/);
    expect(alertsMatch).toBeTruthy();
    
    const procedureContent = alertsMatch![0];
    expect(procedureContent).not.toContain("if (!['admin', 'owner', 'manager'].includes(ctx.user.role))");
    expect(procedureContent).not.toContain("throw new Error('Unauthorized')");
  });

  it("should verify recentActivity has no role check", () => {
    const routersContent = readFileSync("./server/routers.ts", "utf-8");
    
    const recentActivityMatch = routersContent.match(/recentActivity: protectedProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]{0,200}/);
    expect(recentActivityMatch).toBeTruthy();
    
    const procedureContent = recentActivityMatch![0];
    expect(procedureContent).not.toContain("if (!['admin', 'owner', 'manager'].includes(ctx.user.role))");
    expect(procedureContent).not.toContain("throw new Error('Unauthorized')");
  });

  it("should verify statsWithTrends has no role check", () => {
    const routersContent = readFileSync("./server/routers.ts", "utf-8");
    
    const statsMatch = routersContent.match(/statsWithTrends: protectedProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]{0,200}/);
    expect(statsMatch).toBeTruthy();
    
    const procedureContent = statsMatch![0];
    expect(procedureContent).not.toContain("if (!['admin', 'owner', 'manager'].includes(ctx.user.role))");
    expect(procedureContent).not.toContain("throw new Error('Unauthorized')");
  });

  it("should verify Dashboard component has no conditional fetching", () => {
    const dashboardContent = readFileSync("./client/src/pages/admin/Dashboard.tsx", "utf-8");
    
    // Should NOT contain canViewStats or enabled conditions
    expect(dashboardContent).not.toContain("canViewStats");
    expect(dashboardContent).not.toContain("enabled: !!");
    
    // Should have simple query calls
    expect(dashboardContent).toContain("trpc.admin.statsWithTrends.useQuery()");
    expect(dashboardContent).toContain("trpc.admin.todaySnapshot.useQuery()");
    expect(dashboardContent).toContain("trpc.admin.alerts.useQuery()");
    expect(dashboardContent).toContain("trpc.admin.recentActivity.useQuery()");
  });

  it("should verify RoleGuard has no conditional custom roles fetching", () => {
    const roleGuardContent = readFileSync("./client/src/components/RoleGuard.tsx", "utf-8");
    
    // Should NOT contain canManageCustomRoles or enabled conditions
    expect(roleGuardContent).not.toContain("canManageCustomRoles");
    expect(roleGuardContent).not.toContain("enabled:");
    
    // Should have simple query call
    expect(roleGuardContent).toContain("trpc.customRoles.getAllCustomRoles.useQuery()");
  });
});
