import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { users, passwordResetTokens, otpTokens } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getResendClient } from "./email";
import { ENV } from "./_core/env";

/**
 * Password Reset Router
 * Handles forgot password, reset password, and change password operations
 */
export const passwordResetRouter = router({
  /**
   * Forgot Password - Send reset email with token
   */
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // Find user by email
      const user = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      
      if (!user || user.length === 0) {
        // Don't reveal if email exists or not for security
        return { success: true, message: "If an account with that email exists, a password reset link has been sent." };
      }

      const foundUser = user[0];

      // All users with passwords can reset them (loginMethod doesn't matter)

      // Generate secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.insert(passwordResetTokens).values({
        userId: foundUser.id,
        token,
        expiresAt,
        used: false,
      });

      // Send reset email
      const resetLink = `${ENV.baseUrl}/reset-password?token=${token}`;
      const resend = getResendClient();
      if (!resend) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Email service is not configured.",
        });
      }

      try {
        await resend.emails.send({
          from: ENV.fromEmail,
          to: input.email,
          subject: "Password Reset Request - Boomiis Restaurant",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #d97706; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9f9f9; }
                .button { display: inline-block; padding: 12px 30px; background-color: #d97706; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                  <p>Hello ${foundUser.name || foundUser.email},</p>
                  <p>We received a request to reset your password for your Boomiis Restaurant staff account.</p>
                  <p>Click the button below to reset your password:</p>
                  <p style="text-align: center;">
                    <a href="${resetLink}" class="button">Reset Password</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #666;">${resetLink}</p>
                  <p><strong>This link will expire in 1 hour.</strong></p>
                  <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                </div>
                <div class="footer">
                  <p>Boomiis Restaurant Management System</p>
                  <p>This is an automated email, please do not reply.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send password reset email. Please try again later.",
        });
      }

      return { success: true, message: "If an account with that email exists, a password reset link has been sent." };
    }),

  /**
   * Reset Password - Validate token and update password
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // Find token in database
      const tokenRecord = await db
        .select()
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.token, input.token), eq(passwordResetTokens.used, false)))
        .limit(1);

      if (!tokenRecord || tokenRecord.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token.",
        });
      }

      const token = tokenRecord[0];

      // Check if token has expired
      if (new Date() > token.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reset token has expired. Please request a new password reset.",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update user password (stored in openId field for password-based accounts)
      await db
        .update(users)
        .set({ openId: hashedPassword })
        .where(eq(users.id, token.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, token.id));

      return { success: true, message: "Password has been reset successfully. You can now log in with your new password." };
    }),

  /**
   * Change Password - For logged-in users
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // All users with passwords can change them (loginMethod doesn't matter)

      // Verify current password
      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      
      if (!user || user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      const foundUser = user[0];
      const isValidPassword = await bcrypt.compare(input.currentPassword, foundUser.openId);

      if (!isValidPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect.",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ openId: hashedPassword })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "Password has been changed successfully." };
    }),

  /**
   * Validate Reset Token - Check if token is valid before showing reset form
   */
  validateResetToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { valid: false, message: "Database connection not available." };
      }

      const tokenRecord = await db
        .select()
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.token, input.token), eq(passwordResetTokens.used, false)))
        .limit(1);

      if (!tokenRecord || tokenRecord.length === 0) {
        return { valid: false, message: "Invalid reset token." };
      }

      const token = tokenRecord[0];

      if (new Date() > token.expiresAt) {
        return { valid: false, message: "Reset token has expired." };
      }

      return { valid: true, message: "Token is valid." };
    }),

  /**
   * Request Password Reset OTP - Send 6-digit OTP to email
   * Rate limited to 5 requests per hour per email
   */
  requestPasswordResetOTP: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // Check rate limiting: max 5 OTP requests per hour per email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentOtps = await db
        .select()
        .from(otpTokens)
        .where(and(
          eq(otpTokens.email, input.email),
          sql`${otpTokens.createdAt} > ${oneHourAgo}`
        ));

      if (recentOtps.length >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many OTP requests. Please try again later.",
        });
      }

      // Find user by email (must be admin)
      const user = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, input.email),
          eq(users.role, "admin")
        ))
        .limit(1);

      // Don't reveal if email exists or not for security
      if (!user || user.length === 0) {
        return { success: true, message: "If an admin account with that email exists, an OTP has been sent." };
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save OTP to database
      await db.insert(otpTokens).values({
        email: input.email,
        code: otpCode,
        expiresAt,
        used: false,
      });

      // Send OTP email
      const resend = getResendClient();
      if (!resend) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Email service is not configured.",
        });
      }

      try {
        await resend.emails.send({
          from: ENV.fromEmail,
          to: input.email,
          subject: "Password Reset OTP - Boomiis Admin",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #d97706; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9f9f9; }
                .otp-code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #d97706; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Password Reset OTP</h1>
                </div>
                <div class="content">
                  <p>Hello ${user[0].name || 'Admin'},</p>
                  <p>We received a request to reset your password for your Boomiis Restaurant admin account.</p>
                  <p>Your One-Time Password (OTP) is:</p>
                  <div class="otp-code">${otpCode}</div>
                  <p><strong>This OTP will expire in 15 minutes.</strong></p>
                  <p>Enter this code on the password reset page to continue.</p>
                  <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                </div>
                <div class="footer">
                  <p>Boomiis Restaurant Admin</p>
                  <p>This is an automated email, please do not reply.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (error) {
        console.error("Failed to send OTP email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP email. Please try again later.",
        });
      }

      return { success: true, message: "If an admin account with that email exists, an OTP has been sent." };
    }),

  /**
   * Verify Password Reset OTP - Check if OTP is valid
   */
  verifyPasswordResetOTP: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // Find OTP in database
      const otpRecord = await db
        .select()
        .from(otpTokens)
        .where(and(
          eq(otpTokens.email, input.email),
          eq(otpTokens.code, input.code),
          eq(otpTokens.used, false)
        ))
        .limit(1);

      if (!otpRecord || otpRecord.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP code.",
        });
      }

      const otp = otpRecord[0];

      // Check if OTP has expired
      if (new Date() > otp.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OTP has expired. Please request a new one.",
        });
      }

      return { success: true, message: "OTP verified successfully." };
    }),

  /**
   * Reset Password with OTP - Update password after OTP verification
   */
  resetPasswordWithOTP: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available.",
        });
      }

      // Find and verify OTP
      const otpRecord = await db
        .select()
        .from(otpTokens)
        .where(and(
          eq(otpTokens.email, input.email),
          eq(otpTokens.code, input.code),
          eq(otpTokens.used, false)
        ))
        .limit(1);

      if (!otpRecord || otpRecord.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP code.",
        });
      }

      const otp = otpRecord[0];

      // Check if OTP has expired
      if (new Date() > otp.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OTP has expired. Please request a new one.",
        });
      }

      // Find user
      const user = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, input.email),
          eq(users.role, "admin")
        ))
        .limit(1);

      if (!user || user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin account not found.",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update user password
      await db
        .update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, user[0].id));

      // Mark OTP as used
      await db
        .update(otpTokens)
        .set({ used: true })
        .where(eq(otpTokens.id, otp.id));

      return { success: true, message: "Password has been reset successfully. You can now log in with your new password." };
    }),
});
