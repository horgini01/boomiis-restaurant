import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rolePermissions, type Role } from "@/lib/rolePermissions";
import { Check, X } from "lucide-react";
import { Fragment } from "react";
import AdminLayout from "@/components/AdminLayout";

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
  ],
  "System Administration": [
    "/admin/users",
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
  "/admin/email-delivery": "Email Delivery",
  "/admin/newsletter-subscribers": "Newsletter Subscribers",
  "/admin/email-campaigns": "Email Campaigns",
  "/admin/sms-templates": "SMS Templates",
  "/admin/restaurant-settings": "Restaurant Info",
  "/admin/settings": "Settings",
};

export default function RolePermissions() {
  const roles: Role[] = ["owner", "admin", "manager", "kitchen_staff", "front_desk"];

  const hasAccess = (role: Role, route: string) => {
    return rolePermissions[role].includes(route);
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
                <strong>Access Count:</strong> {rolePermissions[role].length} routes
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                </tr>
              </thead>
              <tbody>
                {Object.entries(routeCategories).map(([category, routes]) => (
                  <Fragment key={category}>
                    <tr className="border-b bg-muted/50">
                      <td colSpan={roles.length + 1} className="p-3 font-semibold">
                        {category}
                      </td>
                    </tr>
                    {routes.map((route) => (
                      <tr key={route} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm">{routeLabels[route]}</td>
                        {roles.map((role) => (
                          <td key={role} className="text-center p-3">
                            {hasAccess(role, route) ? (
                              <Check className="inline-block w-5 h-5 text-green-500" />
                            ) : (
                              <X className="inline-block w-5 h-5 text-red-500/30" />
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

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-sm">Has access to this route</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500/30" />
            <span className="text-sm">No access to this route</span>
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
