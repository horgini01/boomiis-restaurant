import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { customRoles, rolePermissions, users } from "../drizzle/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

// Role-based authorization helper - only owners can manage custom roles
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "owner") {
    throw new Error("Access denied. Only owners can manage custom roles.");
  }
  return next({ ctx });
});

export const customRolesRouter = router({
  // Get all custom roles with their permissions
  getAllCustomRoles: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const roles = await db
      .select()
      .from(customRoles)
      .orderBy(desc(customRoles.createdAt));

    // Fetch permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));
        
        return {
          ...role,
          permissions: permissions.map(p => p.route),
        };
      })
    );

    return rolesWithPermissions;
  }),

  // Get single custom role by ID
  getCustomRoleById: ownerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.id, input.id))
        .limit(1);

      if (role.length === 0) {
        throw new Error('Custom role not found');
      }

      const permissions = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, input.id));

      return {
        ...role[0],
        permissions: permissions.map(p => p.route),
      };
    }),

  // Create new custom role with permissions
  createCustomRole: ownerProcedure
    .input(z.object({
      roleName: z.string().min(1).max(100),
      description: z.string().optional(),
      permissions: z.array(z.string()).min(1, "At least one permission is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Generate slug from role name
      const roleSlug = input.roleName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Check if role with same slug already exists
      const existing = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.roleSlug, roleSlug))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('A role with this name already exists');
      }

      // Insert custom role
      const [result] = await db.insert(customRoles).values({
        roleName: input.roleName,
        roleSlug,
        description: input.description || null,
        isActive: true,
        createdBy: ctx.user.id,
      });

      const roleId = result.insertId;

      // Insert permissions
      const permissionValues = input.permissions.map(route => ({
        roleId,
        route,
      }));

      await db.insert(rolePermissions).values(permissionValues);

      return { 
        success: true, 
        roleId,
        message: 'Custom role created successfully' 
      };
    }),

  // Update custom role (name, description, permissions)
  updateCustomRole: ownerProcedure
    .input(z.object({
      id: z.number(),
      roleName: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id, permissions, ...updates } = input;

      // Check if role exists
      const existing = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Custom role not found');
      }

      // Update role name and generate new slug if name is changing
      if (updates.roleName) {
        const roleSlug = updates.roleName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

        // Check if new slug conflicts with another role
        const conflict = await db
          .select()
          .from(customRoles)
          .where(and(
            eq(customRoles.roleSlug, roleSlug),
            eq(customRoles.id, id) // Exclude current role
          ))
          .limit(1);

        if (conflict.length > 0 && conflict[0].id !== id) {
          throw new Error('A role with this name already exists');
        }

        (updates as any).roleSlug = roleSlug;
      }

      // Update role details
      if (Object.keys(updates).length > 0) {
        await db.update(customRoles).set(updates).where(eq(customRoles.id, id));
      }

      // Update permissions if provided
      if (permissions && permissions.length > 0) {
        // Delete existing permissions
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

        // Insert new permissions
        const permissionValues = permissions.map(route => ({
          roleId: id,
          route,
        }));

        await db.insert(rolePermissions).values(permissionValues);
      }

      return { success: true, message: 'Custom role updated successfully' };
    }),

  // Delete custom role (also removes all associated permissions)
  deleteCustomRole: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check if any users are assigned to this role
      // Note: Custom roles are stored as role slugs in the users table
      const role = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.id, input.id))
        .limit(1);

      if (role.length > 0) {
        const usersWithRole = await db
          .select()
          .from(users)
          .where(sql`${users.role} = ${role[0].roleSlug}`)
          .limit(1);

        if (usersWithRole.length > 0) {
          throw new Error('Cannot delete role: users are currently assigned to this role. Please reassign them first.');
        }
      }

      // Delete permissions first (foreign key constraint)
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.id));

      // Delete the role
      await db.delete(customRoles).where(eq(customRoles.id, input.id));

      return { success: true, message: 'Custom role deleted successfully' };
    }),

  // Get all available routes for permission selection
  getAvailableRoutes: ownerProcedure.query(async () => {
    // Define all admin routes with categories
    const routes = [
      {
        category: "Dashboard & Overview",
        routes: [
          { route: "/admin/dashboard", label: "Dashboard" },
          { route: "/admin/analytics", label: "Analytics" },
        ],
      },
      {
        category: "Orders & Kitchen",
        routes: [
          { route: "/admin/orders", label: "Orders Management" },
          { route: "/admin/kitchen", label: "Kitchen Display" },
        ],
      },
      {
        category: "Menu Management",
        routes: [
          { route: "/admin/menu", label: "Menu Items" },
          { route: "/admin/menu-categories", label: "Menu Categories" },
        ],
      },
      {
        category: "Reservations & Events",
        routes: [
          { route: "/admin/reservations", label: "Reservations" },
          { route: "/admin/events", label: "Events & Catering" },
        ],
      },
      {
        category: "Content Management",
        routes: [
          { route: "/admin/blog", label: "Blog Posts" },
          { route: "/admin/gallery", label: "Gallery" },
          { route: "/admin/testimonials", label: "Testimonials" },
        ],
      },
      {
        category: "Marketing",
        routes: [
          { route: "/admin/newsletter", label: "Newsletter Subscribers" },
          { route: "/admin/campaigns", label: "Email Campaigns" },
        ],
      },
      {
        category: "User Management",
        routes: [
          { route: "/admin/users", label: "Admin Users" },
          { route: "/admin/role-permissions", label: "Role Permissions" },
          { route: "/admin/custom-roles", label: "Custom Roles" },
        ],
      },
      {
        category: "Settings",
        routes: [
          { route: "/admin/settings", label: "General Settings" },
          { route: "/admin/delivery-areas", label: "Delivery Areas" },
          { route: "/admin/opening-hours", label: "Opening Hours" },
          { route: "/admin/email-templates", label: "Email Templates" },
          { route: "/admin/sms-templates", label: "SMS Templates" },
        ],
      },
    ];

    return routes;
  }),
});
