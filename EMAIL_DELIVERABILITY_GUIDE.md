# Email Deliverability Guide for Boomiis Restaurant

**Purpose:** Prevent emails from landing in spam folders and ensure reliable delivery to customers

---

## Current Email Setup Analysis

### What We Found:

**✅ Good Practices Already in Place:**
- Using Resend API for email delivery (reputable ESP)
- Professional FROM address format: `Boomiis Restaurant <orders@boomiis.com>`
- HTML email templates with proper structure
- Email logging for tracking
- Custom template support

**⚠️ Issues Causing Spam Problems:**
1. **No Domain Authentication** - SPF, DKIM, DMARC records not configured
2. **Missing Plain Text Version** - Only sending HTML (spam filters prefer both)
3. **Generic Domain** - Using boomiis.com instead of your actual domain
4. **No List-Unsubscribe Header** - Required for bulk emails
5. **Potential Spam Trigger Words** - Need to review email content
6. **No Email Warm-up Strategy** - Sending from new domain without reputation building

---

## CRITICAL: Domain Authentication (Must Do First)

### Step 1: Configure SPF Record

**What is SPF?** Sender Policy Framework tells email servers which servers are allowed to send email from your domain.

**Action Required:**
1. Log in to your domain registrar (where you bought boomiis.uk)
2. Go to DNS settings
3. Add this TXT record:

```
Type: TXT
Name: @ (or leave blank for root domain)
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

**Verification:**
After 24-48 hours, test at: https://mxtoolbox.com/spf.aspx

---

### Step 2: Configure DKIM Record

**What is DKIM?** DomainKeys Identified Mail adds a digital signature to your emails to prove they haven't been tampered with.

**Action Required:**
1. Log in to Resend Dashboard: https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain: `boomiis.uk`
4. Resend will provide 3 DNS records - add them to your domain registrar:

```
Example (your actual values will be different):
Type: TXT
Name: resend._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
TTL: 3600
```

5. Wait for Resend to verify (usually 10-30 minutes)

**Verification:**
Resend dashboard will show "Verified" status when complete

---

### Step 3: Configure DMARC Record

**What is DMARC?** Domain-based Message Authentication tells email servers what to do if SPF or DKIM checks fail.

**Action Required:**
Add this TXT record to your DNS:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@boomiis.uk; pct=100
TTL: 3600
```

**What this means:**
- `p=none` - Monitor only (don't reject emails yet)
- `rua=mailto:dmarc@boomiis.uk` - Send reports to this email
- After 30 days of monitoring, change to `p=quarantine` then `p=reject`

**Verification:**
Test at: https://mxtoolbox.com/dmarc.aspx

---

## Email Content Improvements

### Common Spam Trigger Words to Avoid:

**❌ Never Use These:**
- "Free", "Winner", "Congratulations"
- "Act now", "Limited time", "Urgent"
- "Click here", "Buy now"
- ALL CAPS TEXT
- Multiple exclamation marks!!!
- "$$$" or "£££"

**✅ Use Instead:**
- "Complimentary" instead of "Free"
- "Available for a short time" instead of "Limited time"
- "View your order" instead of "Click here"
- Proper sentence case
- Single punctuation marks
- Write out currency: "£12.99"

---

### Email Content Best Practices:

**1. Subject Lines:**
```
❌ BAD: "FREE DELIVERY!!! ORDER NOW!!!"
✅ GOOD: "Your Boomiis Order Confirmation - #12345"

❌ BAD: "URGENT: Your food is ready!!!"
✅ GOOD: "Order #12345 is ready for pickup"
```

**2. Email Body:**
- Keep HTML simple (avoid complex layouts)
- Use web-safe fonts (Arial, Helvetica, Georgia)
- Include alt text for all images
- Maintain 60:40 text-to-image ratio
- Include physical address in footer
- Add unsubscribe link for marketing emails

**3. Links:**
- Use descriptive link text (not "click here")
- Limit to 3-5 links per email
- Use HTTPS links only
- Don't use URL shorteners (bit.ly, tinyurl)

---

## Technical Improvements Implemented

### 1. Plain Text Version

All emails now include both HTML and plain text versions. This is required by many spam filters.

**Implementation:**
```typescript
// Automatically generate plain text from HTML
const plainText = htmlToText(htmlContent, {
  wordwrap: 80,
  preserveNewlines: true,
});

await resend.emails.send({
  from: FROM_EMAIL,
  to: recipientEmail,
  subject: subject,
  html: htmlContent,
  text: plainText, // ← Now included
});
```

---

### 2. Proper Email Headers

Added headers that improve deliverability:

```typescript
headers: {
  'X-Entity-Ref-ID': orderNumber, // Unique identifier
  'List-Unsubscribe': '<mailto:unsubscribe@boomiis.uk>', // Required for marketing
  'X-Mailer': 'Boomiis Restaurant System', // Identifies sender
}
```

---

### 3. Reply-To Address

Set proper reply-to address so customers can respond:

```typescript
replyTo: 'hello@boomiis.uk', // Customer service email
```

---

### 4. Email Validation

Validate email addresses before sending:

```typescript
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

---

## Email Warm-up Strategy

**Problem:** New domains/IPs have no sending reputation. Sending high volumes immediately triggers spam filters.

**Solution:** Gradually increase sending volume over 4-6 weeks.

### Week-by-Week Plan:

**Week 1: Start Slow**
- Send 10-20 emails per day
- Only to engaged users (staff, friends, family)
- Monitor bounce rates and spam complaints

**Week 2: Gradual Increase**
- Send 50-100 emails per day
- Mix of transactional (orders) and marketing
- Ensure high open rates (>20%)

**Week 3: Scale Up**
- Send 200-300 emails per day
- Start regular customer communications
- Monitor deliverability metrics

**Week 4-6: Full Volume**
- Send up to 1000+ emails per day
- Full marketing campaigns
- Maintain good sending practices

**Key Metrics to Monitor:**
- Bounce rate: Keep below 2%
- Spam complaint rate: Keep below 0.1%
- Open rate: Aim for 20%+
- Click rate: Aim for 2%+

---

## Resend Dashboard Configuration

### 1. Verify Your Domain

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter: `boomiis.uk`
4. Add all DNS records provided
5. Wait for verification (green checkmark)

### 2. Set Up Webhooks

Monitor email delivery status in real-time:

1. Go to: https://resend.com/webhooks
2. Click "Add Webhook"
3. Enter your webhook URL: `https://your-domain.manus.space/api/email/webhook`
4. Select events:
   - `email.sent`
   - `email.delivered`
   - `email.bounced`
   - `email.complained` (spam report)
   - `email.opened`
   - `email.clicked`

### 3. Configure Suppression List

Automatically prevent sending to bounced/complained addresses:

1. Go to: https://resend.com/suppression-list
2. Enable automatic suppression
3. Review list weekly
4. Remove false positives manually

---

## Testing Email Deliverability

### 1. Mail Tester (Free)

1. Go to: https://www.mail-tester.com/
2. Send a test email to the address shown
3. Click "Then check your score"
4. Aim for 9/10 or 10/10

**Common Issues:**
- Score below 7: DNS records not configured
- Score 7-8: Content has spam triggers
- Score 9+: Good to go!

### 2. Gmail Postmaster Tools (Free)

1. Sign up: https://postmaster.google.com/
2. Verify domain ownership
3. Monitor:
   - Spam rate
   - IP reputation
   - Domain reputation
   - Feedback loop

### 3. Inbox Placement Test

Send test emails to:
- Gmail (personal)
- Outlook/Hotmail
- Yahoo Mail
- Apple Mail (iCloud)

Check if they land in:
- ✅ Inbox (good)
- ⚠️ Promotions tab (acceptable for marketing)
- ❌ Spam folder (needs fixing)

---

## Monitoring & Maintenance

### Daily Checks:
- [ ] Review Resend dashboard for bounces
- [ ] Check spam complaint rate (should be 0%)
- [ ] Monitor email logs in admin dashboard

### Weekly Checks:
- [ ] Review email open rates
- [ ] Check for delivery failures
- [ ] Update suppression list
- [ ] Review customer feedback

### Monthly Checks:
- [ ] Analyze DMARC reports
- [ ] Review Gmail Postmaster data
- [ ] Run Mail Tester check
- [ ] Clean email list (remove inactive subscribers)

---

## Emergency: Emails Still Going to Spam?

### Immediate Actions:

**1. Check DNS Records:**
```bash
# Check SPF
dig TXT boomiis.uk +short

# Check DKIM
dig TXT resend._domainkey.boomiis.uk +short

# Check DMARC
dig TXT _dmarc.boomiis.uk +short
```

**2. Review Recent Emails:**
- Are you using spam trigger words?
- Is HTML too complex?
- Too many images?
- Missing plain text version?

**3. Check Resend Dashboard:**
- Any bounces or complaints?
- Domain verified?
- Sending limits reached?

**4. Test with Mail Tester:**
- Run test and fix issues shown
- Aim for 9/10 or higher

**5. Contact Resend Support:**
- If all above checks pass
- Provide: domain, sample email, Mail Tester score
- Support: support@resend.com

---

## Marketing Email Best Practices

### For Newsletter/Campaign Emails:

**1. Always Include:**
- [ ] Unsubscribe link (required by law)
- [ ] Physical business address
- [ ] Clear sender name
- [ ] Reason they're receiving email

**2. Content Guidelines:**
- Personalize with customer name
- Segment audience (don't blast everyone)
- A/B test subject lines
- Send at optimal times (Tue-Thu, 10am-2pm)
- Mobile-first design (60% open on mobile)

**3. Frequency:**
- Transactional: Unlimited (order confirmations, etc.)
- Marketing: Max 2-3 per week
- Newsletters: Once per week or bi-weekly

---

## Legal Compliance

### UK GDPR Requirements:

**1. Consent:**
- [ ] Explicit opt-in for marketing emails
- [ ] Cannot pre-check subscription boxes
- [ ] Must keep records of consent

**2. Unsubscribe:**
- [ ] Must be easy to find
- [ ] Must work within 48 hours
- [ ] Cannot require login to unsubscribe

**3. Data Protection:**
- [ ] Store emails securely
- [ ] Don't share with third parties
- [ ] Delete upon request (right to be forgotten)

### CAN-SPAM Act (if sending to US customers):

- [ ] Don't use false/misleading headers
- [ ] Include physical address
- [ ] Honor opt-out requests within 10 days
- [ ] Monitor what others do on your behalf

---

## Quick Reference Checklist

### Before Sending Any Email:

- [ ] Domain authenticated (SPF, DKIM, DMARC)
- [ ] Using verified domain in Resend
- [ ] FROM address matches domain
- [ ] Subject line is clear and specific
- [ ] No spam trigger words
- [ ] Both HTML and plain text versions
- [ ] All images have alt text
- [ ] Physical address in footer
- [ ] Unsubscribe link (for marketing)
- [ ] Tested in Mail Tester (9/10+)
- [ ] Tested in Gmail, Outlook, Yahoo

---

## Support Resources

**Resend Documentation:**
- https://resend.com/docs

**DNS Configuration Help:**
- https://resend.com/docs/dashboard/domains/introduction

**Email Best Practices:**
- https://resend.com/docs/knowledge-base/email-best-practices

**Deliverability Guide:**
- https://resend.com/docs/knowledge-base/deliverability

**Support Contact:**
- Email: support@resend.com
- Dashboard: https://resend.com/support

---

## Summary: Your Action Plan

### ✅ Do This Now (Critical):

1. **Configure DNS Records** (30 minutes)
   - Add SPF record
   - Add DKIM records from Resend
   - Add DMARC record

2. **Verify Domain in Resend** (10 minutes)
   - Add boomiis.uk to Resend
   - Wait for verification

3. **Update FROM_EMAIL** (5 minutes)
   - Change to: `Boomiis Restaurant <orders@boomiis.uk>`
   - Update in Management UI → Settings → Secrets

### ✅ Do This Week:

4. **Review Email Content** (1 hour)
   - Remove spam trigger words
   - Simplify HTML templates
   - Add plain text versions

5. **Set Up Monitoring** (30 minutes)
   - Configure Resend webhooks
   - Sign up for Gmail Postmaster
   - Run Mail Tester

6. **Start Email Warm-up** (Ongoing)
   - Week 1: 10-20 emails/day
   - Gradually increase over 4-6 weeks

### ✅ Do This Month:

7. **Monitor & Optimize** (Ongoing)
   - Check deliverability metrics weekly
   - Review DMARC reports
   - Clean email list monthly
   - A/B test subject lines

---

**Expected Results:**

After implementing these changes:
- **Week 1:** Emails should stop going to spam for most providers
- **Week 2-4:** Deliverability improves as domain reputation builds
- **Month 2+:** Consistent inbox placement (95%+)

**Questions?** Review this guide or contact Resend support for help.
