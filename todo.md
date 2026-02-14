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
- [ ] Push tested fix to GitHub and redeploy to Railway
