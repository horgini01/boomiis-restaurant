import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rolePermissions, type Role, getRouteCount } from "@/lib/rolePermissions";
import { Check, X } from "lucide-react";
import { Fragment } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

const roleDescriptions: Record<Role, { description: string; color: string }> = {
  owner: {
    description: "Full system access including user management, settings, and all operations",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  admin: {
    description: "Full access to all features including user management and system settings",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  manager: {
    description: "Operations management including menu, orders, reservations, and analytics",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  kitchen_staff: {
    description: "Kitchen display and order management only",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  front_desk: {
    description: "Customer-facing operations: reservations, events, reviews, and testimonials",
    color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  },
};

const routeCategories = {
  "Core Operations": [
    "/admin/dashboard",
    "/admin/orders",
    "/admin/reservations",
    "/admin/events",
  ],
  "Menu Management": [
    "/admin/categories",
    "/admin/menu-items",
  ],
  "Customer Engagement": [
    "/admin/reviews",
    "/admin/testimonials",
    "/admin/response-templates",
  ],
  "Content Management": [
    "/admin/gallery",
    "/admin/blog",
    "/admin/about-content",
    "/admin/legal-pages",
  ],
  "Analytics & Reporting": [
    "/admin/analytics",
    "/admin/email-tracking",
    "/admin/sms-analytics",
  ],
  "System Administration": [
    "/admin/users",
    "/admin/custom-roles",
    "/admin/role-permissions",
    "/admin/audit-logs",
    "/admin/settings",
    "/admin/restaurant-settings",
  ],
  "Communications": [
    "/admin/email-delivery",
    "/admin/newsletter-subscribers",
    "/admin/email-campaigns",
    "/admin/sms-templates",
  ],
};

const routeLabels: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/categories": "Categories",
  "/admin/menu-items": "Menu Items",
  "/admin/orders": "Orders",
  "/admin/reservations": "Reservations",
  "/admin/events": "Events & Catering",
  "/admin/reviews": "Reviews",
  "/admin/testimonials": "Testimonials",
  "/admin/response-templates": "Response Templates",
  "/admin/gallery": "Gallery",
  "/admin/blog": "Blog",
  "/admin/about-content": "About Content",
  "/admin/legal-pages": "Legal Pages",
  "/admin/analytics": "Analytics",
  "/admin/users": "Admin Users",
  "/admin/custom-roles": "Custom Roles",
  "/admin/role-permissions": "Role Permissions",
  "/admin/audit-logs": "Audit Logs",
  "/admin/email-delivery": "Email Delivery",
  "/admin/newsletter-subscribers": "Newsletter Subscribers",
  "/admin/email-campaigns": "Email Campaigns",
  "/admin/email-tracking": "Email Tracking",
  "/admin/sms-templates": "SMS Templates",
  "/admin/sms-analytics": "SMS Analytics",
  "/admin/restaurant-settings": "Restaurant Info",
  "/admin/settings": "Settings",
};

export default function RolePermissions() {
  const roles: Role[] = ["owner", "admin", "manager", "kitchen_staff", "front_desk"];
  
  // Fetch custom roles
  const { data: customRoles } = trpc.customRoles.getAllCustomRoles.useQuery();

  const hasAccess = (role: Role, route: string) => {
    return rolePermissions[role].includes(route);
  };
  
  const customRoleHasAccess = (roleId: number, route: string) => {
    const role = customRoles?.find(r => r.id === roleId);
    return role?.permissions.includes(route) || false;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Overview of access rights for each user role in the system
        </p>
      </div>

      {/* Role Descriptions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className={roleDescriptions[role].color}>
                  {role.replace("_", " ").toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>{roleDescriptions[role].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <strong>Access Count:</strong> {getRouteCount(role)} routes
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Custom Roles Section */}
      {customRoles && customRoles.length > 0 && (
        <>
          <div className="mt-8">
            <h2 className="text-2xl font-bold">Custom Roles</h2>
            <p className="text-muted-foreground mt-2">
              User-defined roles with specific permission sets
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                      {role.roleName}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{role.description || "No description provided"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <strong>Access Count:</strong> {role.permissions.length} routes
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <strong>Status:</strong> {role.isActive ? "Active" : "Inactive"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Detailed breakdown of route access by role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Category / Route</th>
                  {roles.map((role) => (
                    <th key={role} className="text-center p-3 font-semibold min-w-[100px]">
                      <Badge variant="outline" className={`${roleDescriptions[role].color} text-xs`}>
                        {role.replace("_", " ")}
                      </Badge>
                    </th>
                  ))}
                  {customRoles && customRoles.map((role) => (
                    <th key={`custom-${role.id}`} className="text-center p-3 font-semibold min-w-[100px]">
                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-xs">
                        {role.roleName}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(routeCategories).map(([category, routes]) => (
                  <Fragment key={category}>
                    <tr className="bg-muted/50">
                      <td colSpan={roles.length + 1 + (customRoles?.length || 0)} className="p-3 font-semibold">
                        {category}
                      </td>
                    </tr>
                    {routes.map((route) => (
                      <tr key={route} className="border-b hover:bg-muted/30">
                        <td className="p-3 pl-8">{routeLabels[route] || route}</td>
                        {roles.map((role) => (
                          <td key={`${route}-${role}`} className="text-center p-3">
                            {hasAccess(role, route) ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </td>
                        ))}
                        {customRoles && customRoles.map((role) => (
                          <td key={`${route}-custom-${role.id}`} className="text-center p-3">
                            {customRoleHasAccess(role.id, route) ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
