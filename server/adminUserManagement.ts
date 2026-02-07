import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, and, or, like, desc, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getResendClient, FROM_EMAIL } from "./email";
import { siteSettings } from "../drizzle/schema";
import { emailTemplates } from "../drizzle/schema";
import { logAuditAction, getIpAddress } from "./services/audit.service";

// Helper function to send emails
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Email] Skipping email - Resend not configured');
    return { success: false };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return { success: false, error };
  }
}

// Role-based authorization helper
const requireRole = (allowedRoles: string[]) => {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
      throw new Error(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
    }
    return next({ ctx });
  });
};

// Only owners can manage users
const ownerProcedure = requireRole(["owner", "admin"]);

export const adminUserManagementRouter = router({
  // List all admin users with optional filters
  getAdminUsers: ownerProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(["owner", "admin", "manager", "kitchen_staff", "front_desk"]).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [
        // Only show admin-level users (not regular customers)
        or(
          eq(users.role, "owner"),
          eq(users.role, "admin"),
          eq(users.role, "manager"),
          eq(users.role, "kitchen_staff"),
          eq(users.role, "front_desk")
        )
      ];

      if (input?.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`),
            like(users.firstName, `%${input.search}%`),
            like(users.lastName, `%${input.search}%`)
          )!
        );
      }

      if (input?.role) {
        conditions.push(eq(users.role, input.role));
      }

      if (input?.status) {
        conditions.push(eq(users.status, input.status));
      }

      const adminUsers = await db
        .select()
        .from(users)
        .where(and(...conditions))
        .orderBy(desc(users.createdAt));

      return adminUsers;
    }),

  // Create new admin user (sends invitation email)
  createAdminUser: ownerProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      role: z.string(), // Can be predefined role or "custom-{id}"
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check if user already exists (regardless of status)
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      
      // If user exists and is active, reject immediately
      if (existing.length > 0 && existing[0].status === 'active') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists. Please use a different email address.'
        });
      }
      
      // If user exists but is inactive, we'll reactivate them with new details
      const isReactivation = existing.length > 0 && existing[0].status === 'inactive';

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Parse role - if it starts with "custom-", extract custom role ID
      let userRole: string;
      let customRoleId: number | null = null;
      
      if (input.role.startsWith("custom-")) {
        customRoleId = parseInt(input.role.replace("custom-", ""));
        userRole = "admin"; // Default to admin for custom roles
      } else {
        userRole = input.role;
      }
      
      if (isReactivation) {
        // Update existing inactive user with new details
        await db.update(users).set({
          firstName: input.firstName,
          lastName: input.lastName,
          name: `${input.firstName} ${input.lastName}`,
          role: userRole as any,
          customRoleId,
          phone: input.phone || null,
          password: hashedPassword,
          status: "inactive", // Keep inactive until they accept invitation
          invitedBy: ctx.user.id,
        }).where(eq(users.id, existing[0].id));
      } else {
        // Create new user with inactive status (will be activated after invitation acceptance)
        const openId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        await db.insert(users).values({
          openId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          name: `${input.firstName} ${input.lastName}`,
          role: userRole as any,
          customRoleId,
          phone: input.phone || null,
          status: "inactive",
          loginMethod: "email",
          invitedBy: ctx.user.id,
          password: hashedPassword,
        });
      }

      // Send invitation email using custom template
      try {
        // Get restaurant name from settings
        const settings = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'restaurant_name')).limit(1);
        const restaurantName = settings[0]?.settingValue || 'Boomiis Restaurant';
        
        // Try to get custom template
        const templates = await db.select().from(emailTemplates).where(eq(emailTemplates.templateType, 'admin_user_welcome')).limit(1);
        
        let subject: string;
        let html: string;
        
        if (templates.length > 0 && templates[0].isActive) {
          const template = templates[0];
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const loginUrl = `${baseUrl}/admin/login`;
          
          // Replace variables in subject
          subject = template.subject
            .replace(/{restaurantName}/g, restaurantName)
            .replace(/{userName}/g, input.firstName);
          
          // Replace variables in body
          let bodyHtml = template.bodyHtml
            .replace(/{restaurantName}/g, restaurantName)
            .replace(/{userName}/g, input.firstName)
            .replace(/{userEmail}/g, input.email)
            .replace(/{userRole}/g, input.role.replace("_", " ").replace("custom-", "Custom Role "))
            .replace(/{loginUrl}/g, loginUrl)
            .replace(/{tempPassword}/g, tempPassword);
          
          // Build complete HTML email
          html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 30px; background-color: ${template.headerColor}; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Welcome to the Team</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px 30px;">
                          ${bodyHtml}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                          <p style="margin: 0; font-size: 12px; color: #666666;">
                            ${template.footerText}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
          `;
        } else {
          // Fallback to default template
          subject = "You've been invited to join Boomiis Restaurant Admin";
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Boomiis Restaurant!</h2>
              <p>Hi ${input.firstName},</p>
              <p>You've been invited by ${ctx.user.name} to join the Boomiis Restaurant admin team as a <strong>${input.role.replace("_", " ")}</strong>.</p>
              <p>Your temporary login credentials:</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${input.email}</p>
                <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>
              <p><strong>Important:</strong> Please change your password immediately after your first login.</p>
              <p>
                <a href="${process.env.BASE_URL}/admin/login" 
                   style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  Login to Admin Panel
                </a>
              </p>
              <p>If you have any questions, please contact ${ctx.user.email}.</p>
              <p>Best regards,<br>Boomiis Restaurant Team</p>
            </div>
          `;
        }
        
        await sendEmail({ to: input.email, subject, html });
      } catch (error) {
        console.error('[Email] Failed to send invitation:', error);
        // Don't fail the user creation if email fails
      }

      return { success: true, message: 'User invited successfully. Invitation email sent.' };
    }),

  // Update admin user details
  updateAdminUser: ownerProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      role: z.string().optional(), // Can be predefined role or "custom-{id}"
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id, role, ...updates } = input;

      // Build name if firstName or lastName is being updated
      if (updates.firstName || updates.lastName) {
        const currentUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (currentUser.length === 0) {
          throw new Error('User not found');
        }

        const firstName = updates.firstName || currentUser[0].firstName || '';
        const lastName = updates.lastName || currentUser[0].lastName || '';
        (updates as any).name = `${firstName} ${lastName}`.trim();
      }

      // Handle role update - parse custom role if needed
      if (role) {
        if (role.startsWith("custom-")) {
          (updates as any).customRoleId = parseInt(role.replace("custom-", ""));
          (updates as any).role = "admin"; // Default to admin for custom roles
        } else {
          (updates as any).role = role;
          (updates as any).customRoleId = null; // Clear custom role if switching to predefined
        }
      }

      await db.update(users).set(updates).where(eq(users.id, id));

      return { success: true };
    }),

  // Update user status (activate/deactivate)
  updateAdminStatus: ownerProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "inactive"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Prevent deactivating yourself
      if (input.id === ctx.user.id && input.status === "inactive") {
        throw new Error('You cannot deactivate your own account');
      }

      await db.update(users).set({ status: input.status }).where(eq(users.id, input.id));

      return { success: true };
    }),

  // Delete admin user (hard delete - permanently removes from database)
  deleteAdminUser: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Prevent deleting yourself
      if (input.id === ctx.user.id) {
        throw new Error('You cannot delete your own account');
      }

      // Get user details before deletion for audit log
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user) throw new Error('User not found');

      // Hard delete - permanently remove from database
      await db.delete(users).where(eq(users.id, input.id));

      // Log audit action
      await logAuditAction({
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
        userRole: ctx.user.role,
        action: 'delete',
        entityType: 'user',
        entityId: input.id,
        entityName: `${user.firstName} ${user.lastName} (${user.email})`,
        ipAddress: getIpAddress(ctx.req.headers),
        userAgent: ctx.req.headers['user-agent'] as string,
      });

      return { success: true };
    }),

  // Bulk update status for multiple users
  bulkUpdateStatus: ownerProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1, "At least one user must be selected"),
      status: z.enum(["active", "inactive"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Prevent deactivating yourself
      if (input.userIds.includes(ctx.user.id) && input.status === "inactive") {
        throw new Error('You cannot deactivate your own account');
      }

      // Update all selected users
      await db
        .update(users)
        .set({ status: input.status })
        .where(inArray(users.id, input.userIds));

      return { 
        success: true, 
        message: `${input.userIds.length} user(s) ${input.status === "active" ? "activated" : "deactivated"} successfully` 
      };
    }),

  // Bulk delete multiple users
  bulkDeleteUsers: ownerProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1, "At least one user must be selected"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Prevent deleting yourself
      if (input.userIds.includes(ctx.user.id)) {
        throw new Error('You cannot delete your own account');
      }

      // Soft delete by setting status to inactive
      await db
        .update(users)
        .set({ status: "inactive" })
        .where(inArray(users.id, input.userIds));

      return { 
        success: true, 
        message: `${input.userIds.length} user(s) deleted successfully` 
      };
    }),
});
