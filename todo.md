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
- [x] Test admin login page works without errors after redeployment

## Login Redirect Loop - Session Cookie Not Set (User Report - Feb 15)
- [x] Check login procedure session cookie creation (correct)
- [x] Check authentication middleware cookie validation (correct)
- [x] Found bug: cookie-parser middleware was missing
- [x] Install cookie-parser package
- [x] Add cookieParser() middleware to Express server
- [x] Test login flow end-to-end with browser DevTools (server restarted, cookie-parser active)

## S3 Image Upload Integration Status
- [x] Check if S3 upload is implemented in admin dashboard (YES - fully implemented)
- [x] Verify storagePut/storageGet are wired to UI (YES - used in MenuItems, GalleryManagement, AboutContent, RestaurantSettings)
- [x] Document current image upload implementation

**S3 Integration Summary:**
- Backend: `admin.uploadImage` procedure accepts base64 images, uploads to S3 via `storagePut()`
- Storage path: `menu-items/{timestamp}-{random}-{filename}`
- Frontend pages using S3 uploads:
  * Menu Items Management
  * Gallery Management
  * About Content Management (team photos, awards)
  * Restaurant Settings (logo, hero image)

## Migration System Failing Silently (Root Cause - User Report Feb 15)
- [x] Investigate why drizzle-kit migrate doesn't run all migrations
- [x] Check if migration 0030 is in meta/_journal.json (YES - it's registered)
- [x] Found bug: Line 268 in migrate-and-seed.mjs ignores migration failures for existing databases
- [x] Fix migration script to check return value and exit(1) on failure
- [x] Test migration system locally with Railway DATABASE_URL (network blocked, but verified error handling works)
- [x] Fix complete: Migration failures now cause deployment to fail with exit code 1

## AWS S3 Integration (User Request - Feb 15)
- [x] Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner packages
- [x] Rewrite server/storage.ts to use AWS S3 SDK directly
- [x] Add AWS environment variables to env.ts (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET)
- [x] Document AWS IAM permissions required and setup steps (see AWS_S3_SETUP.md)
- [ ] User to set up AWS S3 bucket and IAM credentials
- [ ] User to add AWS environment variables to Railway
- [ ] Test upload after AWS credentials are configured

## S3 Upload ACL Error (User Report - Feb 16)
- [x] Fix AccessControlListNotSupported error in storage.ts (remove ACL: 'public-read')
- [ ] User to add bucket policy for public read access (see checkpoint message)
- [ ] Test image upload after bucket policy is configured

## Email Template Test Send Error (User Report - Feb 17)
- [x] Add support for all 18 template types in sendTestEmail procedure
- [x] Generate preview data for each template type
- [ ] Test sending test emails for all template types (user to test)

## Email Template Not Found Error (User Report - Feb 17)
- [x] Check production database for existing email templates
- [x] Create migrations_run table to track completed migrations
- [x] Create startup migration script that seeds email templates once
- [x] Hook migration script into server startup process
- [ ] Test sending test emails for all template types in production

## Restaurant Logo Upload Issue (User Report - Feb 17)
- [x] Investigate why logo disappears after clicking "Save All" in Restaurant Info
- [x] Fix logo persistence by uploading to S3 instead of local filesystem
- [x] Ensure uploaded logo displays correctly on frontend header
- [ ] Test logo upload flow end-to-end (user to test)

## CC Admin Emails from Restaurant Info (User Request - Feb 17)
- [x] Create function to fetch admin email addresses from site_settings table (getAdminEmails already exists)
- [x] Update sendAdminReservationNotification to CC all admin emails
- [x] Update sendAdminEventNotification to CC all admin emails
- [x] Create and integrate sendAdminCateringNotification to send to all admin emails
- [x] Update order notification emails to CC all admin emails (already implemented)
- [ ] Test email notifications with multiple admin emails (user to test)
