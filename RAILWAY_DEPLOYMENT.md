# Railway Deployment Guide for RestaurantPro

This comprehensive guide walks you through deploying your RestaurantPro application to Railway with production-ready configuration.

---

## Prerequisites

Before deploying to Railway, ensure you have the following ready:

**Accounts and Services**:
- Railway account (sign up at railway.app)
- GitHub account with your code repository
- Stripe account with API keys
- Resend account with API key
- MySQL database (Railway provides one, or use external like PlanetScale)

**Local Requirements** (for testing):
- Docker installed (to test the Dockerfile locally)
- Git configured with your repository

---

## Architecture Overview

Your RestaurantPro application uses a modern, production-ready architecture that Railway handles seamlessly. The application consists of several integrated components that work together to provide a complete restaurant management solution.

The **frontend** is built with React 19 and Vite, providing a fast, responsive user interface. The build process compiles all React components, applies Tailwind CSS styling, and optimizes assets for production delivery. The compiled static files are served directly by the Express server, eliminating the need for a separate frontend hosting service.

The **backend** runs on Express 4 with tRPC 11, providing type-safe API endpoints. The server handles all business logic, database operations, payment processing, and email notifications. It serves both the API endpoints and the compiled frontend files from a single process, simplifying deployment and reducing infrastructure costs.

The **database** layer uses Drizzle ORM with MySQL, providing type-safe database queries and automatic migrations. Railway can provision a MySQL database automatically, or you can connect to an external database like PlanetScale or AWS RDS. The application includes migration scripts that run automatically on deployment.

**File storage** currently uses local filesystem storage for uploaded images and logos. For production deployments, the Dockerfile creates persistent directories that Railway maintains across deployments. For high-traffic applications, you can optionally migrate to S3-compatible storage.

**External services** include Stripe for payment processing and Resend for email notifications. These services are completely independent of your hosting provider and work identically whether you deploy to Railway, Vercel, or your own servers. The application communicates with these services via their standard APIs using environment variables for configuration.

---

## Deployment Steps

### Step 1: Prepare Your Repository

First, ensure your code is pushed to a GitHub repository. Railway deploys directly from GitHub, automatically rebuilding your application whenever you push changes.

Create a new GitHub repository if you haven't already, then push your RestaurantPro code. The repository should include all the deployment files created in this guide, including the Dockerfile, .dockerignore, and railway.json configuration.

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit with Railway deployment configuration"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/restaurantpro.git

# Push to GitHub
git push -u origin main
```

### Step 2: Create Railway Project

Log in to your Railway account at railway.app and create a new project. Railway will guide you through connecting your GitHub repository and configuring your deployment.

**Create New Project**:
1. Click "New Project" on your Railway dashboard
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub account
4. Select your RestaurantPro repository
5. Railway will automatically detect the Dockerfile and begin the first deployment

**Project Configuration**:
Railway automatically detects the Dockerfile and uses it for building your application. The railway.json file provides additional configuration for health checks and restart policies. No manual configuration is needed for the build process.

### Step 3: Add MySQL Database

Your application requires a MySQL database. Railway makes this simple with one-click database provisioning.

**Option A: Railway MySQL (Recommended for Getting Started)**:
1. In your Railway project, click "New Service"
2. Select "Database" → "MySQL"
3. Railway provisions a MySQL instance and automatically adds DATABASE_URL to your environment
4. No additional configuration needed - the connection string is automatically available

**Option B: External Database (PlanetScale, AWS RDS, etc.)**:
If you prefer using an external database provider, you can manually add the DATABASE_URL environment variable with your connection string. This approach gives you more control over database configuration, backups, and scaling.

### Step 4: Configure Environment Variables

Railway requires environment variables for your application to function correctly. Add these variables in the Railway dashboard under your project's "Variables" section.

**Required Environment Variables**:

```bash
# Database (automatically set if using Railway MySQL)
DATABASE_URL=mysql://user:password@host:port/database

# Application Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://your-app.railway.app
JWT_SECRET=your-secure-random-string-min-32-characters

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Notifications (Resend)
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=orders@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Restaurant Branding
VITE_APP_TITLE=Your Restaurant Name
VITE_APP_LOGO=/logos/your-logo.png

# OAuth Configuration (for admin login)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=your-manus-app-id
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name

# Built-in Services (optional, for Manus features)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
```

**How to Add Variables in Railway**:
1. Open your project in Railway dashboard
2. Click on your service (the one running your app)
3. Go to "Variables" tab
4. Click "New Variable" for each environment variable
5. Enter the variable name and value
6. Railway automatically restarts your service when variables change

**Generating Secure Secrets**:

For JWT_SECRET and other security-sensitive values, generate strong random strings:

```bash
# Generate a secure random string (32+ characters)
openssl rand -base64 32
```

### Step 5: Configure Stripe Webhooks

Stripe requires a webhook endpoint to notify your application about payment events. Configure this in your Stripe dashboard after your Railway deployment is live.

**Webhook Configuration**:
1. Log in to your Stripe Dashboard (dashboard.stripe.com)
2. Go to "Developers" → "Webhooks"
3. Click "Add endpoint"
4. Enter your webhook URL: `https://your-app.railway.app/api/stripe/webhook`
5. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Copy the webhook signing secret (starts with `whsec_`)
7. Add it to Railway as `STRIPE_WEBHOOK_SECRET` environment variable

**Testing Webhooks**:
Stripe provides a webhook testing tool in the dashboard. Use it to send test events and verify your application handles them correctly. Check your Railway logs to see webhook events being processed.

### Step 6: Run Database Migrations

After your first deployment, you need to run database migrations to create all necessary tables. Railway provides a simple way to execute commands in your running container.

**Run Migrations**:
1. In Railway dashboard, go to your service
2. Click on "Deployments" tab
3. Find your active deployment
4. Click the three dots (•••) → "View Logs"
5. Open a new terminal/shell in the deployment
6. Run: `pnpm db:push`

Alternatively, you can add a migration step to your Dockerfile or use Railway's deployment hooks. The migrations create all required tables including menu items, orders, reservations, users, and settings.

**Verify Migrations**:
After running migrations, verify the database tables were created correctly. You can use Railway's built-in database viewer or connect with a MySQL client using the DATABASE_URL connection string.

### Step 7: Configure Custom Domain (Optional)

Railway provides a default domain (your-app.railway.app), but you can add your own custom domain for a professional appearance.

**Add Custom Domain**:
1. In Railway dashboard, go to your service
2. Click "Settings" tab
3. Scroll to "Domains" section
4. Click "Add Domain"
5. Enter your domain (e.g., restaurantpro.yourdomain.com)
6. Railway provides DNS configuration instructions
7. Add the CNAME record to your domain's DNS settings
8. Wait for DNS propagation (usually 5-30 minutes)

**Update Environment Variables**:
After adding a custom domain, update the BASE_URL environment variable to match your new domain. This ensures email links, OAuth redirects, and other absolute URLs work correctly.

```bash
BASE_URL=https://restaurantpro.yourdomain.com
```

### Step 8: Verify Deployment

After deployment completes, verify everything works correctly by testing all major features.

**Health Check**:
Visit `https://your-app.railway.app/api/health` - should return status 200 OK.

**Frontend**:
Visit your application URL - the homepage should load with your restaurant branding.

**Admin Login**:
Navigate to `/admin/login` and test logging in with your admin credentials.

**Order Flow**:
1. Browse menu items
2. Add items to cart
3. Proceed to checkout
4. Complete a test order with Stripe test card (4242 4242 4242 4242)
5. Verify order confirmation email is sent
6. Check admin dashboard for the new order

**Kitchen Display**:
Visit `/kitchen` and verify active orders appear correctly.

**Database**:
Check that orders, menu items, and other data persist correctly across deployments.

---

## Monitoring and Maintenance

Railway provides comprehensive monitoring tools to keep your application running smoothly. Understanding these tools helps you quickly identify and resolve issues.

**Application Logs**:
Railway captures all console output from your application, including errors, warnings, and informational messages. Access logs through the Railway dashboard under "Deployments" → "View Logs". The logs update in real-time, making it easy to debug issues as they occur.

**Metrics and Usage**:
Railway tracks CPU usage, memory consumption, network traffic, and request counts. These metrics help you understand your application's performance and identify potential bottlenecks. Access metrics in the "Metrics" tab of your service.

**Health Checks**:
The Dockerfile includes a health check that Railway uses to monitor application availability. If health checks fail repeatedly, Railway automatically restarts your service. You can view health check status in the deployment logs.

**Automatic Deployments**:
Railway automatically deploys whenever you push to your GitHub repository's main branch. This continuous deployment workflow means your production application always reflects your latest code. You can disable automatic deployments in the service settings if you prefer manual control.

**Rollback Capability**:
If a deployment introduces issues, Railway makes rollback simple. Go to "Deployments", find a previous working deployment, and click "Redeploy". Railway instantly switches back to the older version while you fix the problem.

**Database Backups**:
If using Railway MySQL, enable automatic backups in the database service settings. Railway can create daily backups and retain them for your specified duration. For external databases, follow your provider's backup procedures.

---

## Troubleshooting Common Issues

### Build Failures

**Symptom**: Railway deployment fails during the build phase.

**Common Causes**:
- Missing dependencies in package.json
- Syntax errors in code
- Build script failures
- Out of memory during build

**Solutions**:
Check the build logs in Railway dashboard for specific error messages. Ensure all dependencies are listed in package.json with correct versions. Test the build locally with `docker build -t restaurantpro .` to reproduce the issue. If the build runs out of memory, consider upgrading your Railway plan or optimizing the build process.

### Application Crashes on Startup

**Symptom**: Deployment succeeds but application immediately crashes.

**Common Causes**:
- Missing environment variables
- Database connection failures
- Port binding issues
- Missing required files

**Solutions**:
Review the application logs for error messages. Verify all required environment variables are set correctly in Railway. Test the DATABASE_URL connection string. Ensure the PORT environment variable is set to 3000. Check that all required files are included in the Docker image.

### Database Connection Errors

**Symptom**: Application starts but cannot connect to database.

**Common Causes**:
- Incorrect DATABASE_URL format
- Database server not accessible
- SSL/TLS configuration issues
- Connection pool exhausted

**Solutions**:
Verify the DATABASE_URL environment variable is correctly formatted: `mysql://username:password@host:port/database`. If using Railway MySQL, ensure the database service is running. For external databases, check firewall rules and SSL requirements. Review connection pool settings in your database configuration.

### Stripe Webhook Failures

**Symptom**: Payments succeed but orders don't update in database.

**Common Causes**:
- Incorrect webhook URL
- Invalid webhook secret
- Webhook signature verification fails
- Application not processing webhook events

**Solutions**:
Verify the webhook URL in Stripe dashboard matches your Railway domain exactly. Ensure STRIPE_WEBHOOK_SECRET environment variable matches the secret from Stripe. Check application logs for webhook processing errors. Use Stripe's webhook testing tool to send test events and verify handling.

### Email Delivery Issues

**Symptom**: Emails not being sent or received.

**Common Causes**:
- Invalid Resend API key
- FROM_EMAIL not verified in Resend
- Email template errors
- Rate limiting

**Solutions**:
Verify RESEND_API_KEY is correct and active. Ensure FROM_EMAIL domain is verified in your Resend account. Check application logs for email sending errors. Review Resend dashboard for delivery status and error messages. For high volume, ensure your Resend plan supports your sending rate.

### File Upload Problems

**Symptom**: Image uploads fail or don't persist across deployments.

**Current Limitation**:
The current Dockerfile uses local filesystem storage, which Railway resets on each deployment. Uploaded files are lost when the container restarts.

**Solutions**:
For production use, migrate file storage to S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces). Update the storage configuration in your application to use the S3 SDK. Alternatively, use Railway's volume mounting feature to persist uploads across deployments (requires Railway Pro plan).

---

## Performance Optimization

### Caching Strategies

Implement caching to reduce database load and improve response times. Consider caching frequently accessed data like menu items, restaurant settings, and popular orders. Use Redis (available as Railway service) for session storage and cache management.

### Database Indexing

Ensure database tables have appropriate indexes for common queries. The schema includes indexes on frequently queried fields, but you may need additional indexes as your application grows. Monitor slow queries and add indexes accordingly.

### CDN for Static Assets

For high-traffic applications, consider serving static assets (images, CSS, JavaScript) through a CDN. Cloudflare provides a free CDN that works seamlessly with Railway. Simply point your domain through Cloudflare and enable caching.

### Image Optimization

The application uses Sharp for image processing. Ensure uploaded images are optimized for web delivery. Consider implementing automatic image resizing and compression when users upload menu item images.

---

## Scaling Your Application

Railway makes scaling straightforward as your restaurant client base grows. Understanding scaling options helps you plan for growth and maintain performance.

**Vertical Scaling**:
Increase CPU and memory allocation for your service. Railway offers multiple plan tiers with different resource limits. Upgrade your plan when you notice consistent high resource usage.

**Horizontal Scaling**:
Railway supports running multiple instances of your application for high availability and load distribution. Update the `numReplicas` setting in railway.json to run multiple containers. Railway automatically load balances traffic between instances.

**Database Scaling**:
As your database grows, consider migrating to a dedicated database service with better performance. PlanetScale offers automatic scaling and branching for development. AWS RDS provides extensive configuration options for large-scale applications.

**Geographic Distribution**:
Railway deploys to multiple regions worldwide. For international clients, deploy separate instances in different regions to reduce latency. Use DNS-based routing to direct users to their nearest instance.

---

## Security Best Practices

**Environment Variables**:
Never commit environment variables or secrets to your repository. Use Railway's environment variable management exclusively. Rotate secrets regularly, especially JWT_SECRET and API keys.

**Database Security**:
Use strong passwords for database connections. Enable SSL/TLS for database connections in production. Regularly update database software to patch security vulnerabilities.

**Dependency Updates**:
Keep dependencies up to date to patch security vulnerabilities. Run `pnpm update` regularly and test thoroughly before deploying. Monitor security advisories for your dependencies.

**Rate Limiting**:
Implement rate limiting on API endpoints to prevent abuse. The application includes basic rate limiting, but you may need to adjust limits based on your traffic patterns.

**HTTPS Only**:
Railway provides HTTPS automatically. Ensure your application redirects HTTP to HTTPS. Never transmit sensitive data over unencrypted connections.

---

## Cost Optimization

**Railway Pricing**:
Railway charges based on resource usage (CPU, memory, network). The free tier is suitable for development and testing. Production applications typically require the Hobby ($5/month) or Pro ($20/month) plan.

**Database Costs**:
Railway MySQL is included in paid plans but has storage limits. For large databases, external providers like PlanetScale may be more cost-effective. Compare pricing based on your expected data volume.

**Monitoring Usage**:
Railway dashboard shows detailed usage metrics. Monitor these regularly to avoid unexpected charges. Set up usage alerts to notify you when approaching plan limits.

**Optimization Tips**:
- Implement caching to reduce database queries
- Optimize images before uploading
- Use efficient database queries with proper indexes
- Clean up old logs and temporary files
- Consider archiving old orders to reduce database size

---

## Backup and Disaster Recovery

**Database Backups**:
Implement regular database backups to prevent data loss. Railway MySQL includes backup features on paid plans. For external databases, use your provider's backup tools. Test backup restoration regularly to ensure backups are valid.

**Code Backups**:
Your code is backed up in GitHub. Ensure you push changes regularly. Use tags or releases to mark stable versions. This makes rollback easier if issues occur.

**Configuration Backups**:
Document all environment variables and configuration settings. Store this documentation securely outside of Railway. This ensures you can quickly recreate your deployment if needed.

**Disaster Recovery Plan**:
Develop a plan for recovering from major failures. Document steps to restore from backups, recreate services, and verify functionality. Test your recovery plan periodically to ensure it works.

---

## Migration from Manus to Railway

If you're migrating an existing RestaurantPro deployment from Manus to Railway, follow these additional steps to ensure a smooth transition.

**Export Data from Manus**:
1. Export your database using the Manus database management UI
2. Download all uploaded files (images, logos) from Manus storage
3. Document all environment variables from Manus settings
4. Export any custom configurations or settings

**Import Data to Railway**:
1. Deploy the application to Railway following the steps above
2. Import the database dump into your Railway MySQL instance
3. Upload images and logos to the appropriate directories
4. Configure all environment variables in Railway
5. Test thoroughly before switching domains

**DNS Migration**:
1. Lower TTL on your domain's DNS records 24 hours before migration
2. Update DNS records to point to Railway
3. Monitor both old and new deployments during transition
4. Verify all functionality works on Railway
5. Decommission Manus deployment after confirming success

**Minimize Downtime**:
Plan the migration during low-traffic periods. Consider using a maintenance page during the transition. Test the Railway deployment thoroughly before switching DNS. Keep the Manus deployment running until you confirm Railway is working correctly.

---

## Additional Resources

**Railway Documentation**:
- Official Railway docs: docs.railway.app
- Railway Discord community: discord.gg/railway
- Railway status page: status.railway.app

**Technology Documentation**:
- Express.js: expressjs.com
- React: react.dev
- Drizzle ORM: orm.drizzle.team
- tRPC: trpc.io
- Stripe: stripe.com/docs
- Resend: resend.com/docs

**Support**:
- Railway support: railway.app/support
- Bravehat Consulting: bravehatconsulting@gmail.com
- RestaurantPro issues: GitHub repository issues page

---

## Conclusion

This deployment guide provides everything you need to successfully deploy RestaurantPro to Railway. The Docker-based deployment ensures consistency across environments and simplifies scaling as your business grows.

Railway's platform handles infrastructure complexity, allowing you to focus on serving your restaurant clients. The automatic deployments, built-in monitoring, and easy scaling make Railway an excellent choice for production applications.

If you encounter issues not covered in this guide, consult the troubleshooting section or reach out to Railway support. The Railway community is active and helpful for resolving deployment challenges.

Your RestaurantPro application is now production-ready and can serve multiple restaurant clients reliably. As you grow, Railway's scaling capabilities ensure your application performs well regardless of traffic volume.
