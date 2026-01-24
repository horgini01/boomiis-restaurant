# Resend Email Setup Guide

This guide explains how to configure automated email notifications for your Boomiis Restaurant application.

## What Emails Are Sent?

### Customer Emails
- **Order Confirmation**: Sent immediately after successful payment with order details, items, and total
- **Reservation Confirmation**: Sent when a customer books a table with date, time, and party size

### Admin Emails
- **New Order Alert**: Real-time notification when a customer places an order
- **New Reservation Alert**: Instant notification when a table is booked

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (includes 100 emails/day, 3,000 emails/month)
3. Verify your email address

### Step 2: Get Your API Key

1. Log into your Resend dashboard
2. Navigate to **API Keys** in the left sidebar
3. Click **Create API Key**
4. Give it a name (e.g., "Boomiis Restaurant Production")
5. Copy the API key (starts with `re_`)

### Step 3: Domain Verification (Production)

For production use, you need to verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `boomiis.com`)
4. Add the provided DNS records to your domain registrar:
   - SPF record
   - DKIM records
   - DMARC record (optional but recommended)
5. Wait for verification (usually takes a few minutes to hours)

**For Testing:** You can skip domain verification and use Resend's test domain. Emails will only be sent to verified email addresses in your Resend account.

### Step 4: Configure Environment Variables

Add these three environment variables to your project:

#### Option A: Via Manus Management UI

1. Open your project in Manus
2. Click the **Settings icon** (gear) in the top-right
3. Go to **Settings → Secrets**
4. Add the following:

```
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=Boomiis Restaurant <orders@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```

#### Option B: For External Deployment

Add to your hosting platform's environment variables:

**Railway / Render / Vercel:**
```bash
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=Boomiis Restaurant <orders@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```

**Local Development (.env file):**
```bash
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=Boomiis Restaurant <orders@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```

### Step 5: Test Email Delivery

#### Testing with Resend Test Domain

1. In Resend dashboard, go to **Audience**
2. Add your email address as a verified recipient
3. Place a test order or create a reservation
4. Check your inbox for the confirmation email

#### Testing with Your Own Domain

Once your domain is verified:
1. Place a test order using any customer email
2. Customer will receive order confirmation
3. Admin email will receive new order notification

## Email Configuration Details

### FROM_EMAIL
- Format: `"Display Name <email@domain.com>"`
- Example: `"Boomiis Restaurant <orders@boomiis.com>"`
- This is the sender address customers see
- Must use your verified domain in production

### ADMIN_EMAIL
- Format: `email@domain.com` or `"Name <email@domain.com>"`
- Example: `admin@boomiis.com` or `"Restaurant Manager <manager@boomiis.com>"`
- Where admin notifications are sent
- Can be any email address (doesn't need to be on your domain)

### RESEND_API_KEY
- Format: `re_xxxxxxxxxxxxxxxxxxxxxxxx`
- Keep this secret! Never commit to git
- Regenerate if compromised

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `RESEND_API_KEY` is set correctly
2. **Check Domain**: Verify your domain is verified in Resend dashboard
3. **Check Logs**: Look for email errors in server logs
4. **Check Spam**: Confirmation emails might be in spam folder

### Server Won't Start

The application is designed to start even without Resend configured. If emails fail, you'll see warnings in logs but the app continues working.

### Test Mode Limitations

- Without domain verification, emails only go to verified recipients
- Add recipient emails in Resend dashboard → Audience
- Production requires domain verification

## Pricing

**Free Tier:**
- 100 emails/day
- 3,000 emails/month
- Perfect for small restaurants

**Paid Plans:**
- Start at $20/month for 50,000 emails
- See [resend.com/pricing](https://resend.com/pricing)

## Email Templates

Email templates are located in `server/email.ts`. You can customize:
- Email styling (colors, fonts, layout)
- Content and messaging
- Restaurant contact information
- Logo and branding

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Support: support@resend.com
- Check server logs for email errors: `.manus-logs/devserver.log`
