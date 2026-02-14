import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Password hashing utilities using bcrypt
 */

const SALT_ROUNDS = 10; // Industry standard for bcrypt

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password from database
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password meets requirements
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * @param password Password to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

/**
 * OTP (One-Time Password) utilities
 */

/**
 * Generate a 6-digit OTP code
 * @returns 6-digit numeric string
 */
export function generateOTP(): string {
  // Generate random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

/**
 * Generate OTP expiry timestamp (10 minutes from now)
 * @returns Date object 10 minutes in the future
 */
export function generateOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // 10 minute expiry
  return expiry;
}

/**
 * Check if OTP is expired
 * @param expiryDate OTP expiry timestamp from database
 * @returns True if OTP is expired
 */
export function isOTPExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}

/**
 * Verify OTP code matches and is not expired
 * @param providedOTP OTP code provided by user
 * @param storedOTP OTP code from database
 * @param expiryDate OTP expiry timestamp from database
 * @returns Object with isValid flag and error message if invalid
 */
export function verifyOTP(
  providedOTP: string,
  storedOTP: string | null,
  expiryDate: Date | null
): { isValid: boolean; error?: string } {
  if (!storedOTP) {
    return { isValid: false, error: 'No OTP found. Please request a new code.' };
  }
  
  if (isOTPExpired(expiryDate)) {
    return { isValid: false, error: 'OTP has expired. Please request a new code.' };
  }
  
  if (providedOTP !== storedOTP) {
    return { isValid: false, error: 'Invalid OTP code. Please try again.' };
  }
  
  return { isValid: true };
}

/**
 * Password reset token utilities
 */

/**
 * Generate a secure password reset token
 * @returns Random hex string
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate reset token expiry (1 hour from now)
 * @returns Date object 1 hour in the future
 */
export function generateResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour expiry
  return expiry;
}

/**
 * Check if reset token is expired
 * @param expiryDate Token expiry timestamp from database
 * @returns True if token is expired
 */
export function isResetTokenExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}
