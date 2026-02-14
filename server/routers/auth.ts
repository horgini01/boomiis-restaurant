import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateOTP,
  generateOTPExpiry,
  verifyOTP,
} from '../_core/auth-utils';
import {
  sendSetupOTPEmail,
  sendPasswordResetOTPEmail,
  sendPasswordChangedEmail,
  sendAdminWelcomeEmail,
} from '../_core/auth-emails';
import jwt from 'jsonwebtoken';
import { ENV } from '../_core/env';

/**
 * Rate limiting store (in-memory for simplicity, use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Authentication router for self-hosted deployments
 */
export const authRouter = router({
  /**
   * Step 1: Request OTP for admin setup
   */
  requestSetupOTP: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Rate limiting: 3 OTP requests per hour per email
      const rateLimitKey = `setup-otp:${input.email}`;
      if (!checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many OTP requests. Please try again later.',
        });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No admin account found with this email address.',
        });
      }

      // Check if user is admin/owner/manager
      if (!['admin', 'owner', 'manager'].includes(user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This account is not authorized for admin access.',
        });
      }

      // Check if setup is already complete
      if (user.isSetupComplete) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Admin setup is already complete. Please use the login page.',
        });
      }

      // Generate OTP
      const otpCode = generateOTP();
      const otpExpires = generateOTPExpiry();

      // Save OTP to database
      await db
        .update(users)
        .set({
          otpCode,
          otpExpires,
        })
        .where(eq(users.id, user.id));

      // Send OTP email
      try {
        await sendSetupOTPEmail(input.email, otpCode, user.name || 'Admin');
      } catch (error) {
        console.error('[Auth] Failed to send OTP email:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email. Please try again.',
        });
      }

      return {
        success: true,
        message: 'Verification code sent to your email.',
      };
    }),

  /**
   * Step 2: Verify OTP and complete admin setup
   */
  completeSetup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otpCode: z.string().length(6, 'OTP must be 6 digits'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      // Verify OTP
      const otpVerification = verifyOTP(input.otpCode, user.otpCode, user.otpExpires);
      if (!otpVerification.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: otpVerification.error || 'Invalid OTP',
        });
      }

      // Validate password
      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.error || 'Invalid password',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Update user
      await db
        .update(users)
        .set({
          passwordHash,
          isSetupComplete: true,
          otpCode: null,
          otpExpires: null,
        })
        .where(eq(users.id, user.id));

      // Send welcome email
      try {
        const loginUrl = `${ENV.baseUrl || 'http://localhost:3000'}/admin/login`;
        await sendAdminWelcomeEmail(input.email, user.name || 'Admin', loginUrl);
      } catch (error) {
        console.error('[Auth] Failed to send welcome email:', error);
      }

      // Create session token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        ENV.cookieSecret,
        { expiresIn: '7d' }
      );

      // Set cookie
      ctx.res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        message: 'Admin setup complete! Redirecting to dashboard...',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
        rememberMe: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Rate limiting: 5 login attempts per 15 minutes per email
      const rateLimitKey = `login:${input.email}`;
      if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many login attempts. Please try again in 15 minutes.',
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
        });
      }

      // Check if user is admin/owner/manager
      if (!['admin', 'owner', 'manager'].includes(user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access the admin panel.',
        });
      }

      // Check if setup is complete
      if (!user.isSetupComplete) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please complete admin setup first.',
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(input.password, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
        });
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // Create session token
      const expiresIn = input.rememberMe ? '30d' : '7d';
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        ENV.cookieSecret,
        { expiresIn }
      );

      // Set cookie
      const maxAge = input.rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000; // 7 days

      ctx.res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
      });

      return {
        success: true,
        message: 'Login successful!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie('auth_token');
    return { success: true, message: 'Logged out successfully.' };
  }),

  /**
   * Request password reset OTP
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
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Rate limiting: 3 OTP requests per hour per email
      const rateLimitKey = `reset-otp:${input.email}`;
      if (!checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many password reset requests. Please try again later.',
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      // Don't reveal if user exists or not (security best practice)
      if (!user) {
        return {
          success: true,
          message: 'If an account exists with this email, you will receive a verification code.',
        };
      }

      // Generate OTP
      const otpCode = generateOTP();
      const otpExpires = generateOTPExpiry();

      // Save OTP
      await db
        .update(users)
        .set({
          otpCode,
          otpExpires,
        })
        .where(eq(users.id, user.id));

      // Send OTP email
      try {
        await sendPasswordResetOTPEmail(input.email, otpCode, user.name || 'User');
      } catch (error) {
        console.error('[Auth] Failed to send password reset OTP:', error);
      }

      return {
        success: true,
        message: 'If an account exists with this email, you will receive a verification code.',
      };
    }),

  /**
   * Verify OTP and reset password
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otpCode: z.string().length(6),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      // Verify OTP
      const otpVerification = verifyOTP(input.otpCode, user.otpCode, user.otpExpires);
      if (!otpVerification.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: otpVerification.error || 'Invalid OTP',
        });
      }

      // Validate password
      const passwordValidation = validatePassword(input.newPassword);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.error || 'Invalid password',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(input.newPassword);

      // Update password
      await db
        .update(users)
        .set({
          passwordHash,
          otpCode: null,
          otpExpires: null,
        })
        .where(eq(users.id, user.id));

      // Send confirmation email
      try {
        await sendPasswordChangedEmail(input.email, user.name || 'User');
      } catch (error) {
        console.error('[Auth] Failed to send password changed email:', error);
      }

      return {
        success: true,
        message: 'Password reset successful! You can now login with your new password.',
      };
    }),

  /**
   * Change password (for logged-in users)
   */
  changePassword: publicProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1, 'Old password is required'),
        newPassword: z.string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get current user from JWT
      const token = ctx.req.cookies.auth_token;
      if (!token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to change your password.',
        });
      }

      let decoded: { userId: number; email: string; role: string };
      try {
        decoded = jwt.verify(token, ENV.cookieSecret) as {
          userId: number;
          email: string;
          role: string;
        };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid session. Please login again.',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      // Verify old password
      const isValidOldPassword = await verifyPassword(input.oldPassword, user.passwordHash);
      if (!isValidOldPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current password is incorrect.',
        });
      }

      // Validate new password
      const passwordValidation = validatePassword(input.newPassword);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.error || 'Invalid password',
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(input.newPassword);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id));

      // Send confirmation email
      try {
        await sendPasswordChangedEmail(user.email!, user.name || 'User');
      } catch (error) {
        console.error('[Auth] Failed to send password changed email:', error);
      }

      return {
        success: true,
        message: 'Password changed successfully',
      };
    }),

  /**
   * Get current user (from JWT token)
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies.auth_token;
    
    if (!token) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        userId: number;
        email: string;
        role: string;
      };

      const db = await getDb();
      if (!db) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      return null;
    }
  }),
});
