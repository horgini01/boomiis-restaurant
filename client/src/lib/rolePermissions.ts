// Role-based access control configuration
export type Role = "owner" | "admin" | "manager" | "kitchen_staff" | "front_desk";

// Define which routes each role can access
export const rolePermissions: Record<Role, string[]> = {
  owner: [
    // Full access to everything
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
    "/admin/role-permissions",
    "/admin/custom-roles",
    "/admin/email-delivery",
    "/admin/newsletter-subscribers",
    "/admin/email-campaigns",
    "/admin/sms-templates",
    "/admin/restaurant-settings",
    "/admin/settings",
  ],
  admin: [
    // Full access including user management
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
    "/admin/role-permissions",
    "/admin/email-delivery",
    "/admin/newsletter-subscribers",
    "/admin/email-campaigns",
    "/admin/sms-templates",
    "/admin/restaurant-settings",
    "/admin/settings",
  ],
  manager: [
    // Operations management - no system settings or user management
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
    "/admin/analytics",
    "/admin/email-delivery",
    "/admin/newsletter-subscribers",
  ],
  kitchen_staff: [
    // Kitchen operations only
    "/admin/dashboard",
    "/admin/orders",
  ],
  front_desk: [
    // Customer-facing operations
    "/admin/dashboard",
    "/admin/reservations",
    "/admin/events",
    "/admin/reviews",
    "/admin/testimonials",
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
  owner: "Full access to all features including user management and critical settings",
  admin: "Full operational access except user management",
  manager: "Manage daily operations, menu, orders, reservations, and content",
  kitchen_staff: "View and manage kitchen orders only",
  front_desk: "Manage customer interactions, reservations, and events",
};
