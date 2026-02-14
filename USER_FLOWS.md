# RestaurantPro System Documentation

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Customer Order Flow](#customer-order-flow)
4. [Admin Authentication Flow](#admin-authentication-flow)
5. [Admin Dashboard Features](#admin-dashboard-features)
6. [Kitchen Display System](#kitchen-display-system)
7. [Technical Architecture](#technical-architecture)
8. [Database Schema](#database-schema)
9. [Security Measures](#security-measures)
10. [Deployment Guide](#deployment-guide)

---

## System Overview

RestaurantPro is a comprehensive restaurant management system built for small independent restaurants. The system provides **guest checkout for customers** (no customer accounts required) and **password-based authentication for staff** (admin, managers, kitchen staff, front desk).

### Key Features

- **Online Ordering**: Customers browse menu, add to cart, and checkout as guests
- **Payment Processing**: Integrated Stripe payment with automatic order creation
- **Order Management**: Real-time order tracking, status updates, kitchen display
- **Menu Management**: Full CRUD operations for categories and menu items
- **Reservation System**: Table booking with email confirmations
- **Email Notifications**: Automated order confirmations, status updates, review requests
- **SMS Notifications**: Optional SMS alerts for order updates (GDPR compliant)
- **Analytics Dashboard**: Sales reports, popular items, customer insights
- **Role-Based Access**: Different permission levels for staff members

---

## User Roles & Permissions

The system supports six user roles with different access levels:

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **Admin** | Full Access | All admin dashboard features, settings, user management, menu, orders, analytics |
| **Owner** | Full Access | Same as Admin (typically the restaurant owner) |
| **Manager** | Full Access | Same as Admin (restaurant managers) |
| **Kitchen Staff** | Limited | Access to kitchen display system only (view orders, update cooking status) |
| **Front Desk** | Limited | Order management, reservations, customer service (no settings or analytics) |
| **User** | N/A | Not used - customers checkout as guests without accounts |

### Access Control Implementation

The system uses tRPC middleware for role-based access control. Admin, Owner, and Manager roles share the same permissions and can access all admin endpoints. Kitchen Staff and Front Desk roles are defined in the database but currently have no authentication (kitchen display is open access for simplicity).

```typescript
// From server/_core/trpc.ts
const allowedRoles = ['admin', 'owner', 'manager'];
// These roles can access ALL admin dashboard features
```

---

## Customer Order Flow

Customers interact with the system without creating accounts. The entire ordering process is guest-based with cart stored in browser localStorage.

### Step-by-Step Flow

**1. Browse Menu**
- Customer visits website homepage
- Navigates to Menu page
- Views categories (Starters, Mains, Desserts, Drinks)
- Clicks on menu items to see details (description, price, allergens, dietary info)

**2. Add to Cart**
- Customer clicks "Add to Cart" on menu items
- Cart icon in header shows item count
- Cart data stored in browser localStorage (persists across page refreshes)
- No login required

**3. View Cart**
- Customer clicks cart icon to view `/cart` page
- Sees all items with quantities and prices
- Can update quantities or remove items
- Sees subtotal calculation

**4. Checkout**
- Customer clicks "Proceed to Checkout"
- Fills out checkout form:
  - **Personal Info**: Name, Email, Phone
  - **Order Type**: Delivery or Pickup
  - **Delivery Address**: Street address and postcode (if delivery)
  - **Preferred Time**: Choose from available time slots
  - **Special Instructions**: Dietary requirements, cooking preferences
  - **SMS Opt-in**: Checkbox for SMS notifications (GDPR compliant, default checked)
  - **Newsletter**: Optional checkbox to subscribe

**5. Payment**
- System calculates:
  - Subtotal (sum of all items)
  - Delivery fee (zone-based, free over minimum order value)
  - Total amount
- System creates Stripe checkout session with order metadata
- Customer redirected to Stripe payment page
- Customer enters card details and pays

**6. Order Confirmation**
- Stripe processes payment
- Stripe webhook fires `checkout.session.completed` event
- System receives webhook and creates order in database:
  - Generates unique order number (e.g., `BO-ABC123-XY45`)
  - Saves customer info, items, delivery details
  - Sets status to "pending"
  - Sets payment status to "paid"
- System sends two emails:
  - **Customer**: Order confirmation with order number, items, estimated time
  - **Admin**: New order notification with full details
- Customer redirected to `/order-success` page showing order number

**7. Order Tracking**
- Customer receives email updates when order status changes:
  - Confirmed → Preparing → Ready → Out for Delivery → Completed
- If SMS opted-in, customer receives SMS notifications
- Customer can contact restaurant using phone/email from confirmation

### Cart Data Structure

Cart is stored in browser localStorage as JSON:

```typescript
interface CartItem {
  id: number;           // Menu item ID
  name: string;         // Item name
  price: number;        // Item price
  quantity: number;     // Quantity ordered
  imageUrl?: string;    // Item image
  prepTime?: number;    // Prep time in minutes
}
```

### Order Data Structure

Orders are saved to database with complete information:

```typescript
interface Order {
  id: number;
  orderNumber: string;              // Unique order number
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  deliveryPostcode?: string;
  scheduledFor?: Date;              // Preferred time
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled' | 'delayed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId: string;          // Stripe payment intent ID
  specialInstructions?: string;
  smsOptIn: boolean;                // SMS consent
  reviewRequestSent: boolean;       // Track review email
  timeline: string;                 // JSON array of status changes
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Admin Authentication Flow

For self-hosted deployments, the system uses password-based authentication with OTP (One-Time Password) verification for security.

### First-Time Admin Setup

When a fresh database is initialized, the system automatically creates a default admin account. The admin must complete setup before accessing the dashboard.

**Step 1: Initial Database Setup**
- System detects empty database on first startup
- Runs migrations to create all tables
- Creates default admin account:
  - Email: `ADMIN_EMAIL` env variable or `admin@restaurant.com`
  - Name: `ADMIN_NAME` env variable or `Admin`
  - Role: `admin`
  - Status: `is_setup_complete = false` (needs setup)

**Step 2: Admin Setup Page (`/admin/setup`)**
- Admin visits `/admin/setup`
- System checks if setup is needed
- Admin enters email address
- System sends 6-digit OTP to email
- Admin enters OTP code (10-minute expiry)
- System validates OTP
- Admin creates password:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
- System hashes password with bcrypt (10 rounds)
- System saves `password_hash` to database
- System marks `is_setup_complete = true`
- Admin redirected to login page

**Step 3: First Login**
- Admin visits `/admin/login`
- Enters email and password
- System validates credentials
- System creates JWT session token (7-day expiry)
- Session stored in httpOnly, secure, sameSite cookie
- Admin redirected to admin dashboard

### Regular Login Flow

**Login Page (`/admin/login`)**
- Admin enters email and password
- Optional: Check "Remember Me" (extends session to 30 days)
- System validates credentials:
  - Checks if user exists
  - Verifies password hash matches
  - Checks if user role is admin/owner/manager
- If valid:
  - Creates JWT session token
  - Sets httpOnly cookie
  - Redirects to `/admin/dashboard`
- If invalid:
  - Shows error message
  - Increments failed login counter
  - Rate limiting: Max 5 attempts per 15 minutes

### Password Reset Flow

**Step 1: Request Reset (`/admin/forgot-password`)**
- Admin clicks "Forgot Password" on login page
- Enters email address
- System checks if email exists
- System generates 6-digit OTP
- System saves OTP to database with 10-minute expiry
- System sends OTP via email
- Rate limiting: Max 3 OTP requests per hour per email

**Step 2: Verify OTP**
- Admin enters 6-digit OTP code
- System validates:
  - OTP matches database
  - OTP not expired (10 minutes)
- If valid, proceeds to password reset
- If invalid, shows error and allows retry

**Step 3: Set New Password**
- Admin enters new password (meets requirements)
- Admin confirms new password
- System hashes password with bcrypt
- System updates `password_hash` in database
- System clears OTP from database
- Admin redirected to login page

### Session Management

**JWT Token Structure**
```typescript
interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  rememberMe: boolean;
}
```

**Token Expiry**
- Default session: 7 days
- Remember Me session: 30 days
- Tokens stored in httpOnly cookies (not accessible via JavaScript)
- Secure flag (HTTPS only in production)
- SameSite=Strict (CSRF protection)

**Session Validation**
- Every admin API request validates JWT token
- If token expired, user redirected to login
- If token invalid, user redirected to login
- Active sessions auto-refresh on activity

---

## Admin Dashboard Features

Once authenticated, admins have access to a comprehensive dashboard with the following features:

### Dashboard Home (`/admin/dashboard`)
- **Today's Overview**: Orders, revenue, reservations
- **Recent Orders**: Last 10 orders with status
- **Quick Actions**: Add menu item, view orders, manage reservations
- **Sales Chart**: Daily/weekly/monthly revenue trends
- **Popular Items**: Top-selling menu items

### Menu Management

**Categories (`/admin/categories`)**
- View all menu categories
- Add new category (name, description, display order)
- Edit category details
- Toggle category active/inactive
- Delete category (if no items)
- Drag-and-drop reordering

**Menu Items (`/admin/menu-items`)**
- View all menu items with filtering by category
- Add new menu item:
  - Name, description, price
  - Category assignment
  - Image upload
  - Dietary flags (vegan, gluten-free, halal)
  - Allergen information
  - Availability toggle
  - Featured/Chef's Special flags
  - Preparation time
- Edit menu item details
- Toggle availability (out of stock)
- Delete menu item
- Bulk operations (activate/deactivate multiple items)

### Order Management (`/admin/orders`)
- View all orders with filtering:
  - By status (pending, confirmed, preparing, ready, completed)
  - By order type (delivery, pickup)
  - By date range
  - Search by order number, customer name, email, phone
- Order details view:
  - Customer information
  - Items ordered with quantities and prices
  - Delivery address and time
  - Special instructions
  - Payment status
  - Order timeline (status change history)
- Update order status:
  - Pending → Confirmed → Preparing → Ready → Out for Delivery → Completed
  - Cancel order (with reason)
  - Mark as delayed (with estimated time)
- Send manual notifications:
  - Email customer
  - SMS customer (if opted-in)
- Print order receipt/kitchen ticket
- Refund order (Stripe integration)

### Reservation Management (`/admin/reservations`)
- View all reservations with calendar view
- Filter by date, status, party size
- Reservation details:
  - Customer name, email, phone
  - Date and time
  - Party size
  - Special requests
- Update reservation status:
  - Pending → Confirmed → Seated → Completed → Cancelled
- Send confirmation emails
- Block time slots for private events

### Analytics (`/admin/analytics`)
- **Sales Reports**:
  - Daily, weekly, monthly revenue
  - Revenue by order type (delivery vs pickup)
  - Average order value
  - Total orders and items sold
- **Popular Items**:
  - Top 10 best-selling items
  - Revenue by menu category
  - Items by quantity sold
- **Customer Insights**:
  - New vs returning customers
  - Order frequency
  - Peak ordering times
  - Delivery zones performance
- **Export Options**:
  - Export reports to CSV/Excel
  - Date range selection
  - Custom report generation

### User Management (`/admin/users`)
- View all staff users
- Add new user:
  - Email, name, role
  - Send invitation email
  - User completes setup via link
- Edit user details
- Change user role
- Deactivate/activate user
- Delete user (with confirmation)
- View user activity log

### Settings

**Restaurant Settings (`/admin/restaurant-settings`)**
- Restaurant name and logo
- Contact information (email, phone, address)
- Opening hours (by day of week)
- Social media links
- About us content
- Terms and conditions

**Email & SMS Settings (`/admin/email-delivery`)**
- Configure email templates
- Test email delivery
- View email send history
- SMS template management
- SMS provider settings

**Delivery Settings**
- Delivery zones with postcodes
- Zone-specific delivery fees
- Minimum order for free delivery
- Average delivery time
- Preparation buffer time

**Payment Settings**
- Stripe configuration
- Test/Live mode toggle
- Webhook status
- Payment history

---

## Kitchen Display System

The kitchen display system provides a real-time view of active orders for kitchen staff.

### Access

**URL**: `/kitchen`  
**Authentication**: Currently open access (no login required)  
**Recommended Setup**: Display on a tablet or monitor in the kitchen

### Features

**Order Display**
- Shows all active orders (pending, confirmed, preparing)
- Color-coded by urgency:
  - Red: Overdue orders
  - Orange: Due soon (within 15 minutes)
  - Green: On time
- Auto-refreshes every 5 seconds
- Sound alerts for new orders

**Order Information**
- Order number
- Order type (delivery/pickup icon)
- Customer name
- Items ordered with quantities
- Special instructions (highlighted)
- Preparation time remaining
- Scheduled/estimated time

**Order Actions**
- Mark as "Preparing" (starts timer)
- Mark as "Ready" (notifies customer)
- View full order details
- Print kitchen ticket

**Filters**
- Filter by order type (all, delivery, pickup)
- Filter by status (pending, preparing, ready)
- Filter by time (overdue, next 30 min, today)
- Search by order number or customer name

**Settings**
- Toggle sound alerts
- Adjust refresh interval
- Font size adjustment (for visibility)

---

## Technical Architecture

### Frontend Stack

- **Framework**: React 19
- **Routing**: Wouter (lightweight client-side routing)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (built on Radix UI)
- **Build Tool**: Vite
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **API Client**: tRPC React Query hooks

### Backend Stack

- **Runtime**: Node.js 22
- **Framework**: Express 4
- **API Layer**: tRPC 11 (end-to-end type safety)
- **Database**: MySQL/TiDB (compatible with any MySQL database)
- **ORM**: Drizzle ORM (TypeScript-first)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Email**: Resend API
- **SMS**: BulkSMS / TextLocal
- **Payment**: Stripe
- **File Storage**: Local filesystem (upgradeable to S3)

### Project Structure

```
boomiis-restaurant/
├── client/                 # Frontend React application
│   ├── public/            # Static assets (images, logos, uploads)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── contexts/      # React contexts (Cart, Auth)
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities and tRPC client
│       └── pages/         # Page components
├── server/                # Backend Express + tRPC
│   ├── _core/            # Core framework (auth, context, middleware)
│   ├── db.ts             # Database query helpers
│   ├── routers.ts        # tRPC API procedures
│   ├── email.ts          # Email sending functions
│   └── webhooks/         # Stripe webhook handlers
├── drizzle/              # Database schema and migrations
│   ├── schema.ts         # Table definitions
│   └── migrations/       # SQL migration files
├── scripts/              # Utility scripts (seeding, migrations)
├── shared/               # Shared types and constants
└── Dockerfile            # Docker container configuration
```

### API Architecture (tRPC)

tRPC provides end-to-end type safety between frontend and backend. No manual API documentation needed - types flow automatically.

**Public Procedures** (no authentication)
- `menu.categories` - Get all menu categories
- `menu.items` - Get menu items (optionally filtered by category)
- `menu.itemBySlug` - Get single menu item by slug
- `payment.createCheckoutSession` - Create Stripe checkout
- `newsletter.subscribe` - Subscribe to newsletter
- `contact.submit` - Submit contact form
- `reservations.create` - Create reservation

**Admin Procedures** (requires admin/owner/manager role)
- `admin.getOrders` - Get all orders
- `admin.updateOrderStatus` - Update order status
- `admin.getMenuItems` - Get menu items for management
- `admin.createMenuItem` - Create new menu item
- `admin.updateMenuItem` - Update menu item
- `admin.deleteMenuItem` - Delete menu item
- `admin.getSettings` - Get restaurant settings
- `admin.updateSettings` - Update settings
- `admin.getUsers` - Get staff users
- `admin.createUser` - Create new staff user
- ... (many more)

**Auth Procedures** (mixed access)
- `auth.setup.checkStatus` - Check if admin setup needed (public)
- `auth.setup.sendOTP` - Send OTP for setup (public)
- `auth.setup.verifyOTP` - Verify OTP (public)
- `auth.setup.completeSetup` - Complete admin setup (public)
- `auth.login` - Login with email/password (public)
- `auth.me` - Get current user (protected)
- `auth.logout` - Logout (protected)
- `auth.forgotPassword.sendOTP` - Send password reset OTP (public)
- `auth.forgotPassword.verifyOTP` - Verify reset OTP (public)
- `auth.forgotPassword.resetPassword` - Reset password (public)
- `auth.changePassword` - Change password (protected)

---

## Database Schema

### Core Tables

**users** - Staff accounts (admin, managers, kitchen staff)
```sql
id: int (primary key)
openId: varchar(64) unique      -- For OAuth compatibility
email: varchar(320)
name: text
password_hash: varchar(255)     -- Bcrypt hashed password
role: enum('user', 'admin', 'owner', 'manager', 'kitchen_staff', 'front_desk')
otp_code: varchar(6)            -- For email verification
otp_expires: timestamp          -- OTP expiry time
password_reset_token: varchar(255)
password_reset_expires: timestamp
is_setup_complete: boolean      -- First-time setup flag
status: enum('active', 'inactive')
created_at: timestamp
updated_at: timestamp
last_signed_in: timestamp
```

**orders** - Customer orders
```sql
id: int (primary key)
order_number: varchar(50) unique
customer_name: varchar(200)
customer_email: varchar(320)
customer_phone: varchar(50)
order_type: enum('delivery', 'pickup')
delivery_address: text
delivery_postcode: varchar(20)
scheduled_for: timestamp
subtotal: decimal(10,2)
delivery_fee: decimal(10,2)
total: decimal(10,2)
status: enum('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'delayed')
payment_status: enum('pending', 'paid', 'failed', 'refunded')
payment_intent_id: varchar(255)
special_instructions: text
sms_opt_in: boolean
review_request_sent: boolean
timeline: text                  -- JSON array of status changes
created_at: timestamp
updated_at: timestamp
```

**order_items** - Items in each order
```sql
id: int (primary key)
order_id: int (foreign key → orders)
menu_item_id: int (foreign key → menu_items)
menu_item_name: varchar(200)
quantity: int
price: decimal(10,2)
created_at: timestamp
```

**menu_categories** - Menu sections
```sql
id: int (primary key)
name: varchar(100)
slug: varchar(100) unique
description: text
display_order: int
is_active: boolean
created_at: timestamp
updated_at: timestamp
```

**menu_items** - Individual dishes
```sql
id: int (primary key)
category_id: int (foreign key → menu_categories)
name: varchar(200)
slug: varchar(200) unique
description: text
price: decimal(10,2)
image_url: text
is_vegan: boolean
is_gluten_free: boolean
is_halal: boolean
allergens: text                 -- JSON array
is_available: boolean
out_of_stock: boolean
is_featured: boolean
is_chef_special: boolean
prep_time_minutes: int
display_order: int
created_at: timestamp
updated_at: timestamp
```

**reservations** - Table bookings
```sql
id: int (primary key)
customer_name: varchar(200)
customer_email: varchar(320)
customer_phone: varchar(50)
reservation_date: date
reservation_time: time
party_size: int
special_requests: text
status: enum('pending', 'confirmed', 'seated', 'completed', 'cancelled')
created_at: timestamp
updated_at: timestamp
```

**site_settings** - Configuration key-value pairs
```sql
id: int (primary key)
setting_key: varchar(100) unique
setting_value: text
created_at: timestamp
updated_at: timestamp
```

---

## Security Measures

### Authentication Security

**Password Requirements**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Hashed with bcrypt (10 rounds, industry standard)

**OTP Security**
- 6-digit numeric code
- 10-minute expiry
- Single-use (cleared after verification)
- Rate limited (3 requests per hour per email)

**Session Security**
- JWT tokens with HS256 algorithm
- httpOnly cookies (not accessible via JavaScript)
- Secure flag (HTTPS only in production)
- SameSite=Strict (prevents CSRF attacks)
- 7-day expiry (30 days with Remember Me)
- Tokens include user ID, email, role

### Rate Limiting

**Login Attempts**
- Maximum 5 failed attempts per 15 minutes per IP
- Lockout period: 15 minutes
- Counter resets on successful login

**OTP Requests**
- Maximum 3 OTP requests per hour per email
- Prevents email bombing
- Applies to both setup and password reset

**API Rate Limiting**
- General API: 100 requests per minute per IP
- Admin endpoints: 60 requests per minute per user
- Webhook endpoints: No rate limiting (Stripe controlled)

### Data Protection

**GDPR Compliance**
- SMS opt-in checkbox (default checked, can opt-out)
- Newsletter opt-in checkbox (default unchecked)
- Cookie consent banner
- Privacy policy and terms pages
- Right to be forgotten (customer data deletion on request)

**PCI Compliance**
- No card data stored (Stripe handles all payment data)
- Only store Stripe payment intent IDs
- Stripe webhooks verify signatures

**SQL Injection Prevention**
- Drizzle ORM parameterized queries
- No raw SQL with user input
- Input validation with Zod schemas

**XSS Prevention**
- React automatically escapes output
- Content Security Policy headers
- No dangerouslySetInnerHTML usage

---

## Deployment Guide

### Environment Variables

**Required Variables**
```bash
# Database
DATABASE_URL=mysql://user:pass@host:3306/db?ssl-mode=REQUIRED

# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com
JWT_SECRET=your-secret-key-here

# Stripe Payment
STRIPE_SECRET_KEY=sk_live_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx
FROM_EMAIL=orders@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Branding
VITE_APP_TITLE=Your Restaurant Name
VITE_APP_LOGO=/logos/your-logo.png
```

**Optional Variables**
```bash
# Admin Setup
ADMIN_NAME=Admin User

# SMS Notifications
BULKSMS_TOKEN_ID=xxx
BULKSMS_TOKEN_SECRET=xxx
TEXTLOCAL_API_KEY=xxx

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.yourdomain.com
VITE_ANALYTICS_WEBSITE_ID=xxx
```

### Railway Deployment Steps

**1. Create Railway Project**
- Sign up at railway.app
- Create new project
- Connect GitHub repository

**2. Add MySQL Database**
- Click "New" → "Database" → "MySQL"
- Railway provides `DATABASE_URL` automatically
- Or use external database (PlanetScale, Aiven, etc.)

**3. Configure Environment Variables**
- Go to project settings
- Add all required environment variables
- Set `DATABASE_URL` to your MySQL connection string

**4. Deploy**
- Railway auto-detects Dockerfile
- Builds with resource limits (512MB RAM, 0.5 CPU)
- Runs migrations on first startup
- Creates default admin account

**5. Complete Admin Setup**
- Visit `https://your-app.railway.app/admin/setup`
- Enter admin email
- Verify OTP sent to email
- Set admin password
- Login and start using the system

**6. Configure Stripe Webhook**
- Go to Stripe Dashboard → Developers → Webhooks
- Add endpoint: `https://your-app.railway.app/api/stripe/webhook`
- Select events: `checkout.session.completed`, `payment_intent.succeeded`
- Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env variable

### Docker Deployment

**Build Image**
```bash
docker build -t restaurantpro .
```

**Run Container**
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  -e STRIPE_SECRET_KEY="..." \
  -e RESEND_API_KEY="..." \
  --name restaurantpro \
  restaurantpro
```

### Migration Strategy

**Build Time** (Dockerfile)
- Generate migration files: `pnpm drizzle-kit generate`
- Build frontend: `pnpm run build`
- Build backend: `pnpm run build`

**Runtime** (First Startup)
- Check if database is initialized
- If empty:
  - Apply migrations (create tables)
  - Seed initial data (settings, cookie policy)
  - Create default admin account
- If initialized:
  - Apply pending migrations only

**Schema Changes**
1. Update `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate` locally
3. Test migration locally
4. Commit migration files to Git
5. Deploy (migrations auto-apply on startup)

---

## Troubleshooting

### Common Issues

**Issue: Admin can't login after setup**
- Check `is_setup_complete` is true in database
- Verify password was saved (check `password_hash` exists)
- Check JWT_SECRET is set in environment variables
- Clear browser cookies and try again

**Issue: OTP not received**
- Check RESEND_API_KEY is valid
- Check FROM_EMAIL is verified in Resend dashboard
- Check spam folder
- Check OTP expiry (10 minutes)
- Check rate limiting (max 3 per hour)

**Issue: Orders not appearing in admin dashboard**
- Check Stripe webhook is configured correctly
- Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
- Check webhook events include `checkout.session.completed`
- View Stripe webhook logs for errors
- Check database connection

**Issue: Database migration fails**
- Check DATABASE_URL is correct
- Check database user has CREATE TABLE permissions
- Check SSL connection (use `ssl-mode=REQUIRED` for Aiven/PlanetScale)
- Check migration files exist in `drizzle/` directory

**Issue: Kitchen display not updating**
- Check browser allows auto-refresh
- Check tRPC endpoint `/api/trpc/admin.getOrders` is accessible
- Check database connection
- Hard refresh browser (Ctrl+Shift+R)

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily**
- Monitor order flow
- Check email delivery
- Review failed payments

**Weekly**
- Review analytics
- Update menu items (seasonal changes)
- Check system performance

**Monthly**
- Update menu images
- Review customer feedback
- Backup database
- Update dependencies

### Backup Strategy

**Database Backups**
- Railway: Automatic daily backups (7-day retention)
- Manual backup: `mysqldump` command
- Store backups in separate location (S3, Dropbox)

**File Backups**
- Backup uploaded images (`client/public/uploads/`)
- Backup logos (`client/public/logos/`)
- Backup custom content

### Monitoring

**Application Monitoring**
- Railway provides logs and metrics
- Monitor response times
- Track error rates
- Set up alerts for downtime

**Business Monitoring**
- Track daily order volume
- Monitor average order value
- Watch for order errors
- Review customer complaints

---

## Changelog

### Version 1.0 (February 14, 2026)
- Initial system documentation
- Complete admin authentication system
- Password-based login with OTP verification
- Password reset flow
- Admin setup flow for first-time deployment
- Railway deployment support
- Comprehensive security measures
- Rate limiting implementation

---

## Appendix

### Glossary

- **OTP**: One-Time Password - A 6-digit code sent via email for verification
- **JWT**: JSON Web Token - A secure token format for session management
- **tRPC**: TypeScript Remote Procedure Call - Type-safe API layer
- **Drizzle ORM**: TypeScript-first database ORM
- **bcrypt**: Password hashing algorithm (industry standard)
- **GDPR**: General Data Protection Regulation - EU data privacy law
- **PCI**: Payment Card Industry - Security standards for payment processing
- **CSRF**: Cross-Site Request Forgery - A type of web security attack
- **XSS**: Cross-Site Scripting - A type of web security vulnerability

### Useful Commands

**Development**
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server
pnpm db:push              # Push schema changes to database
pnpm test                 # Run tests
```

**Production**
```bash
pnpm build                # Build for production
pnpm start                # Start production server
pnpm drizzle-kit generate # Generate migrations
pnpm drizzle-kit migrate  # Apply migrations
```

**Database**
```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate

# View database
pnpm drizzle-kit studio

# Seed data
node scripts/seed-settings.mjs
node seed-cookie-policy.mjs
node scripts/seed-menu.mjs
```

---

**End of Documentation**

For questions or support, contact: bravehatconsulting@gmail.com
