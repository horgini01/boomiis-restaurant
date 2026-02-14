# Environment Variables for Railway Deployment

This document lists all environment variables required for deploying RestaurantPro to Railway.

---

## Required Environment Variables

### Database Configuration

**DATABASE_URL**
- **Description**: MySQL connection string
- **Format**: `mysql://username:password@host:port/database`
- **Railway MySQL Example**: `mysql://root:password@mysql.railway.internal:3306/railway`
- **PlanetScale Example**: `mysql://username:password@aws.connect.psdb.cloud/database?ssl={"rejectUnauthorized":true}`
- **Note**: Automatically set if using Railway MySQL

### Application Configuration

**NODE_ENV**
- **Description**: Application environment
- **Value**: `production`
- **Required**: Yes

**PORT**
- **Description**: Port the server listens on
- **Value**: `3000`
- **Note**: Railway may override this automatically

**BASE_URL**
- **Description**: Base URL of your application (used for emails, redirects)
- **Example**: `https://your-app.railway.app` or `https://restaurantpro.yourdomain.com`
- **Required**: Yes

**JWT_SECRET**
- **Description**: Secret key for JWT session management
- **Requirements**: Minimum 32 characters, cryptographically random
- **Generate with**: `openssl rand -base64 32`
- **Required**: Yes

### Stripe Payment Processing

**STRIPE_SECRET_KEY**
- **Description**: Stripe secret API key
- **Format**: `sk_live_...` (production) or `sk_test_...` (development)
- **Get from**: https://dashboard.stripe.com/apikeys
- **Required**: Yes

**VITE_STRIPE_PUBLISHABLE_KEY**
- **Description**: Stripe publishable API key (frontend)
- **Format**: `pk_live_...` (production) or `pk_test_...` (development)
- **Get from**: https://dashboard.stripe.com/apikeys
- **Required**: Yes

**STRIPE_WEBHOOK_SECRET**
- **Description**: Stripe webhook signing secret
- **Format**: `whsec_...`
- **Get from**: https://dashboard.stripe.com/webhooks
- **Setup**: Create webhook endpoint at `https://your-app.railway.app/api/stripe/webhook`
- **Events**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- **Required**: Yes

### Email Notifications (Resend)

**RESEND_API_KEY**
- **Description**: Resend API key for sending emails
- **Format**: `re_...`
- **Get from**: https://resend.com/api-keys
- **Required**: Yes

**FROM_EMAIL**
- **Description**: Email address to send from
- **Example**: `orders@yourdomain.com`
- **Note**: Must be verified in Resend dashboard
- **Required**: Yes

**ADMIN_EMAIL**
- **Description**: Email address to receive admin notifications
- **Example**: `admin@yourdomain.com`
- **Required**: Yes

### Restaurant Branding

**VITE_APP_TITLE**
- **Description**: Restaurant name displayed in the application
- **Example**: `Boomiis Restaurant`
- **Required**: Yes

**VITE_APP_LOGO**
- **Description**: Path to restaurant logo
- **Example**: `/logos/restaurant-logo.png`
- **Note**: Relative to `client/public` directory
- **Required**: No (defaults to text logo if not provided)

### OAuth Configuration (Optional - for Manus Auth)

**OAUTH_SERVER_URL**
- **Description**: Manus OAuth server URL
- **Value**: `https://api.manus.im`
- **Required**: Only if using Manus OAuth

**VITE_OAUTH_PORTAL_URL**
- **Description**: Manus OAuth portal URL (frontend)
- **Value**: `https://auth.manus.im`
- **Required**: Only if using Manus OAuth

**VITE_APP_ID**
- **Description**: Manus application ID
- **Required**: Only if using Manus OAuth

**OWNER_OPEN_ID**
- **Description**: Owner's Manus Open ID
- **Required**: Only if using Manus OAuth

**OWNER_NAME**
- **Description**: Owner's name
- **Required**: Only if using Manus OAuth

### Built-in Services (Optional - Manus Features)

**BUILT_IN_FORGE_API_URL**
- **Description**: Manus Forge API URL (server-side)
- **Value**: `https://forge.manus.im`
- **Required**: Only if using Manus built-in services

**BUILT_IN_FORGE_API_KEY**
- **Description**: Manus Forge API key (server-side)
- **Required**: Only if using Manus built-in services

**VITE_FRONTEND_FORGE_API_KEY**
- **Description**: Manus Forge API key (frontend)
- **Required**: Only if using Manus built-in services

**VITE_FRONTEND_FORGE_API_URL**
- **Description**: Manus Forge API URL (frontend)
- **Value**: `https://forge.manus.im`
- **Required**: Only if using Manus built-in services

---

## Optional Environment Variables

### Analytics

**VITE_ANALYTICS_ENDPOINT**
- **Description**: Analytics service endpoint
- **Required**: No

**VITE_ANALYTICS_WEBSITE_ID**
- **Description**: Website ID for analytics service
- **Required**: No

### SMS Notifications

**BULKSMS_TOKEN_ID**
- **Description**: BulkSMS token ID
- **Required**: Only if using BulkSMS for notifications

**BULKSMS_TOKEN_SECRET**
- **Description**: BulkSMS token secret
- **Required**: Only if using BulkSMS for notifications

**TEXTLOCAL_API_KEY**
- **Description**: Textlocal API key
- **Required**: Only if using Textlocal for notifications

---

## How to Add Variables in Railway

1. Open your project in Railway dashboard
2. Click on your service (the one running your app)
3. Go to "Variables" tab
4. Click "New Variable" for each environment variable
5. Enter the variable name and value
6. Railway automatically restarts your service when variables change

---

## Security Best Practices

1. **Never commit environment variables to version control**
2. **Use different values for development, staging, and production**
3. **Rotate secrets regularly** (at least every 90 days)
4. **Generate strong random values** for JWT_SECRET using cryptographic tools
5. **Keep backup** of production environment variables in secure location (password manager, encrypted file)
6. **Test all integrations** (Stripe, Resend) in test mode before going live
7. **Use Railway's built-in secrets management** - never store secrets in code or configuration files

---

## Generating Secure Secrets

For security-sensitive values like JWT_SECRET, use cryptographically secure random generation:

```bash
# Generate a 32-character base64 random string
openssl rand -base64 32

# Generate a 64-character hex random string
openssl rand -hex 32

# Generate using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Troubleshooting

### Missing Environment Variables

If your application fails to start with errors about missing environment variables:

1. Check Railway dashboard → Variables tab
2. Verify all required variables are set
3. Ensure variable names match exactly (case-sensitive)
4. Check for typos in variable values
5. Restart the service after adding variables

### Invalid Environment Variable Values

If services fail to connect (database, Stripe, Resend):

1. Verify the format of connection strings
2. Test API keys in their respective dashboards
3. Ensure URLs include protocol (https://)
4. Check for trailing spaces or newlines in values
5. Verify domain verification for email services

### Environment Variables Not Updating

If changes to environment variables don't take effect:

1. Railway automatically restarts services when variables change
2. Wait 30-60 seconds for restart to complete
3. Check deployment logs for restart confirmation
4. If issues persist, manually trigger a redeploy
5. Clear browser cache if frontend variables changed (VITE_*)

---

## Migration Checklist

When migrating from Manus to Railway, ensure you have:

- [ ] DATABASE_URL configured
- [ ] JWT_SECRET generated and set
- [ ] BASE_URL updated to Railway domain
- [ ] Stripe keys (STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Resend configuration (RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL)
- [ ] Restaurant branding (VITE_APP_TITLE, VITE_APP_LOGO)
- [ ] All optional services configured if needed
- [ ] Stripe webhook URL updated to Railway domain
- [ ] FROM_EMAIL domain verified in Resend
- [ ] Test deployment with all integrations working

---

## Support

If you need help configuring environment variables:

- **Railway Documentation**: https://docs.railway.app/develop/variables
- **Bravehat Consulting**: bravehatconsulting@gmail.com
- **Railway Support**: https://railway.app/support
