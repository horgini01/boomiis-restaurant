# Project TODO

## Complete Admin Authentication System (User Request - Feb 14)
- [x] Create comprehensive system documentation (USER_FLOWS.md)
- [x] Update database schema (password_hash, otp_code, otp_expires, password_reset_token, password_reset_expires, is_setup_complete)
- [x] Generate and test database migration
- [x] Implement password hashing utilities (bcrypt)
- [x] Implement OTP generation and validation
- [x] Create email templates for OTP codes
- [x] Create tRPC auth procedures (setup, login, logout, forgot password, change password)
- [x] Build admin setup page (/admin/setup) with OTP verification
- [x] Build login page (/admin/login) with Remember Me (already exists)
- [x] Build forgot password page (/forgot-password) with OTP flow
- [x] Add routes for new auth pages
- [x] Implement JWT session management with httpOnly cookies
- [x] Update tRPC context to support both OAuth and JWT authentication
- [x] Fix RoleGuard TypeScript errors
- [x] Fix AdminLayout TypeScript errors
- [x] Update migration script to create admin with is_setup_complete=false
- [x] Add rate limiting for login attempts (5 per 15 min)
- [x] Add rate limiting for OTP requests (3 per hour)
- [ ] Test complete setup flow with fresh database (user to test)
- [ ] Test login with correct/incorrect credentials (user to test)
- [ ] Test password reset flow (user to test)
- [ ] Update Dockerfile to generate migrations at build time
- [ ] Push to GitHub

## Railway Deployment Fixes (Completed - Feb 14)
- [x] Fix database SSL connection warning (ssl-mode parameter)
- [x] Add automatic database migration on startup
- [x] Add automatic admin account creation if none exists
- [x] Make OAuth optional for self-hosting
- [x] Update Dockerfile to run migrations before starting server
- [x] Add startup script to handle initial database setup

## Railway Build Error Fix (User Report - Feb 14)
- [x] Add ARG DATABASE_URL to Dockerfile before drizzle-kit generate command
- [ ] Test Railway build with the fix (user to test)
- [ ] Push to GitHub

## Migration Script Syntax Error (User Report - Feb 14)
- [x] Fix syntax error in migrate-and-seed.mjs (function name has space: "parseDatabase URL" should be "parseDatabaseURL")
- [x] Test migration script locally before deployment
- [x] Push fix to GitHub and redeploy to Railway

## SSL Certificate Error in Migration Script (User Report - Feb 14)
- [x] Fix SSL certificate handling in parseDatabaseURL() function
- [x] Update drizzle connection to properly handle SSL certificates
- [x] Rewrite script to use proper mysql2 connection config object (not uri property)
- [x] Test connection config parsing with Railway DATABASE_URL
- [x] Verify syntax with node --check
- [x] Push tested fix to GitHub and redeploy to Railway

## Production Deployment Issues (User Report - Feb 14)
- [x] Fix seed-settings.mjs import path (cannot find /app/drizzle/schema.js in production)
- [x] Inline all seeding logic into migrate-and-seed.mjs to avoid import path issues
- [x] Fix admin creation SQL query (use single quotes instead of double quotes for MySQL string values)
- [x] Verify syntax with node --check
- [x] Push fixes to GitHub and redeploy to Railway

## Database Schema Mismatch (User Report - Feb 14)
- [ ] Check migration files to see actual column names created in database
- [ ] Fix schema.ts to match actual database column names
- [ ] Generate new migration to add missing columns
- [ ] Test admin setup flow

## SSL Handshake Error in Scheduled Jobs (User Report - Feb 14)
- [x] Find reservation reminders job and other scheduled jobs
- [x] Fix database connection in server/db.ts (rejectUnauthorized: false)
- [x] Trigger Railway rebuild to compile latest schema and apply SSL fix

## Admin Setup Email Not Recognized (User Report - Feb 15)
- [ ] Explain current admin setup flow logic
- [ ] Check if admin account exists in database with user's email
- [ ] Verify migration script created admin account correctly
- [ ] Fix admin setup to recognize custom admin email (bravehatconsulting@gmail.com)

## Critical Admin Flow Issues (User Report - Feb 15)
- [x] Fix createDefaultAdmin function to properly handle SQL errors and create admin account
- [x] Document admin setup flow purpose (setup = first-time password creation, not registration)
- [x] Fix "Invalid URL" error on /admin/login page (removed OAuth redirects, use /admin/login)
- [ ] Test complete admin authentication flow (setup → login → dashboard) - requires manual SQL insert first

## Admin Self-Registration Implementation (User Request - Feb 15)
- [x] Remove createDefaultAdmin() call from migration script (keep function commented for reference)
- [x] Add ADMIN_SIGNUP_SECRET and ALLOW_ADMIN_SIGNUP env variables to server/_core/env.ts
- [x] Create auth.registerAdmin tRPC procedure with validation logic
- [x] Create /admin/register frontend page with firstname, lastname, email, password, secret fields
- [x] Test: First admin registration (no admins in DB, ALLOW_ADMIN_SIGNUP=false) ✅ PASSED
- [x] Test: First admin registration with wrong secret ✅ PASSED
- [x] Test: Second admin registration (1 admin exists, ALLOW_ADMIN_SIGNUP=false) - should fail ✅ PASSED
- [x] Test: Second admin registration (1 admin exists, ALLOW_ADMIN_SIGNUP=true) - should succeed ✅ PASSED
- [x] Test: Duplicate email registration - should fail ✅ PASSED
- [x] Test: Weak password validation - should fail ✅ PASSED
## Invalid URL Error on Admin Login Page (User Report - Feb 15)
- [x] Search for all getLoginUrl() calls in codebase (found in useAuth.ts)
- [x] Fix useAuth hook to use '/admin/login' instead of getLoginUrl()
- [ ] Test admin login page works without errors after redeployment
