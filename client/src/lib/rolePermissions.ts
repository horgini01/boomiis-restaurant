// Role-based access control configuration
export type Role = "owner" | "admin" | "manager" | "kitchen_staff" | "front_desk";

// All available admin routes (28 total routes)
const ALL_ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/categories",
  "/admin/menu-items",
  "/admin/orders",
  "/admin/reservations",
  "/admin/events",
  "/admin/reviews",
  "/admin/testimonials",
  "/admin/response-templates",
  "/admin/gallery",
  "/admin/blog",
  "/admin/about-content",
  "/admin/legal-pages",
  "/admin/analytics",
  "/admin/users",
  "/admin/custom-roles",
  "/admin/audit-logs",
  "/admin/email-delivery",
  "/admin/newsletter-subscribers",
  "/admin/email-campaigns",
  "/admin/email-tracking",
  "/admin/sms-templates",
  "/admin/sms-analytics",
  "/admin/restaurant-settings",
  "/admin/settings",
  "/admin/role-permissions",
  "/admin/change-password",
];

// Define which routes each role can access
export const rolePermissions: Record<Role, string[]> = {
  owner: [
    // Full access to all 26 routes
    ...ALL_ADMIN_ROUTES,
  ],
  admin: [
    // Full access to all 26 routes
    ...ALL_ADMIN_ROUTES,
  ],
  manager: [
    // Operations management - no system settings, user management, or custom roles (22 routes)
    "/admin/dashboard",
    "/admin/categories",
    "/admin/menu-items",
    "/admin/orders",
    "/admin/reservations",
    "/admin/events",
    "/admin/reviews",
    "/admin/testimonials",
    "/admin/response-templates",
    "/admin/gallery",
    "/admin/blog",
    "/admin/about-content",
    "/admin/analytics",
    "/admin/audit-logs",
    "/admin/email-delivery",
    "/admin/email-tracking",
    "/admin/newsletter-subscribers",
    "/admin/email-campaigns",
    "/admin/sms-templates",
    "/admin/sms-analytics",
    "/admin/restaurant-settings",
    "/admin/change-password",
  ],
  kitchen_staff: [
    // Kitchen operations only (3 routes)
    "/admin/dashboard",
    "/admin/orders",
    "/admin/change-password",
  ],
  front_desk: [
    // Customer-facing operations (6 routes)
    "/admin/dashboard",
    "/admin/reservations",
    "/admin/events",
    "/admin/reviews",
    "/admin/testimonials",
    "/admin/change-password",
  ],
};

// Check if a user with a given role can access a specific route
export function canAccessRoute(role: Role | undefined, route: string): boolean {
  if (!role) return false;
  
  const allowedRoutes = rolePermissions[role];
  if (!allowedRoutes) return false;
  
  // Check exact match or if route starts with allowed path (for sub-routes)
  return allowedRoutes.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + "/")
  );
}

// Get filtered navigation items based on role
export function getAccessibleRoutes(role: Role | undefined): string[] {
  if (!role) return [];
  return rolePermissions[role] || [];
}

// Get route count for each role
export function getRouteCount(role: Role): number {
  return rolePermissions[role]?.length || 0;
}

// Role display names
export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  kitchen_staff: "Kitchen Staff",
  front_desk: "Front Desk",
};

// Role descriptions for UI
export const roleDescriptions: Record<Role, string> = {
  owner: "Full access to all 28 admin features including user management and critical settings",
  admin: "Full access to all 28 admin features including user management and critical settings",
  manager: "Manage daily operations, menu, orders, reservations, and content (22 routes)",
  kitchen_staff: "View and manage kitchen orders only (3 routes: Dashboard, Orders, Change Password)",
  front_desk: "Manage customer interactions, reservations, and events (6 routes)",
};
