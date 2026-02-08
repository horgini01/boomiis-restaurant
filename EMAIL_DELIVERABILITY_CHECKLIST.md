# Email Deliverability Quick Checklist

Use this checklist before sending any email campaign or after making changes to email templates.

---

## ✅ Technical Setup (One-Time)

### DNS Records
- [ ] SPF record added: `v=spf1 include:_spf.resend.com ~all`
- [ ] DKIM records added (from Resend dashboard)
- [ ] DMARC record added: `v=DMARC1; p=none; rua=mailto:dmarc@boomiis.uk`
- [ ] All DNS records verified (green checkmark in Resend)

### Resend Configuration
- [ ] Domain verified in Resend dashboard
- [ ] FROM address matches verified domain (orders@boomiis.uk)
- [ ] Webhooks configured for delivery tracking
- [ ] Suppression list enabled

### Email Warm-up
- [ ] Week 1: Sending 10-20 emails/day
- [ ] Week 2: Sending 50-100 emails/day
- [ ] Week 3: Sending 200-300 emails/day
- [ ] Week 4+: Full volume (1000+ emails/day)

---

## ✅ Before Every Email Send

### Content Check
- [ ] Subject line under 60 characters
- [ ] Subject line NOT all caps
- [ ] Maximum 1 exclamation mark in subject
- [ ] No spam trigger words (free, winner, urgent, click here, etc.)
- [ ] Plain text version included
- [ ] HTML is simple and clean (not overly complex)
- [ ] All images have alt text
- [ ] Text-to-image ratio is 60:40 or better
- [ ] Maximum 5 links in email body
- [ ] All links use HTTPS (not HTTP)
- [ ] No URL shorteners (bit.ly, tinyurl, etc.)

### Headers & Metadata
- [ ] FROM address is professional (not noreply@)
- [ ] Reply-To address is monitored
- [ ] Unsubscribe link included (for marketing emails)
- [ ] Physical business address in footer
- [ ] Email has unique identifier (X-Entity-Ref-ID)

### Validation
- [ ] Recipient email address validated
- [ ] Spam score calculated (should be < 50)
- [ ] Tested in Mail Tester (score 9/10 or higher)
- [ ] Previewed in Gmail, Outlook, Apple Mail
- [ ] Mobile responsive (tested on phone)

---

## ✅ After Sending

### Monitoring (Daily)
- [ ] Check Resend dashboard for bounces
- [ ] Review spam complaint rate (should be 0%)
- [ ] Monitor delivery rate (should be 98%+)
- [ ] Check for failed sends

### Analysis (Weekly)
- [ ] Review open rates (target: 20%+)
- [ ] Review click rates (target: 2%+)
- [ ] Check bounce rate (should be < 2%)
- [ ] Review unsubscribe rate (should be < 0.5%)
- [ ] Update suppression list

### Maintenance (Monthly)
- [ ] Review DMARC reports
- [ ] Check Gmail Postmaster data
- [ ] Run Mail Tester check
- [ ] Clean email list (remove inactive)
- [ ] A/B test subject lines
- [ ] Review and update templates

---

## 🚨 Red Flags (Stop Sending If You See These)

- [ ] Bounce rate > 5%
- [ ] Spam complaint rate > 0.5%
- [ ] Delivery rate < 90%
- [ ] Mail Tester score < 7/10
- [ ] Multiple DNS records failing
- [ ] Resend domain not verified
- [ ] High number of spam trigger words

**If you see any red flags:** Stop sending, fix the issue, then resume gradually.

---

## 📊 Target Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Delivery Rate | 98%+ | 95-98% | < 95% |
| Bounce Rate | < 2% | 2-5% | > 5% |
| Spam Complaint Rate | < 0.1% | 0.1-0.5% | > 0.5% |
| Open Rate | 20%+ | 15-20% | < 15% |
| Click Rate | 2%+ | 1-2% | < 1% |
| Unsubscribe Rate | < 0.5% | 0.5-1% | > 1% |
| Mail Tester Score | 9-10/10 | 7-8/10 | < 7/10 |

---

## 🔧 Quick Fixes for Common Issues

### Emails Going to Spam
1. Check DNS records are configured correctly
2. Run Mail Tester and fix issues shown
3. Remove spam trigger words from content
4. Add plain text version
5. Reduce number of links/images
6. Slow down sending rate

### High Bounce Rate
1. Validate all email addresses before sending
2. Remove invalid addresses from list
3. Check for typos in email addresses
4. Enable double opt-in for signups
5. Clean list regularly (remove inactive)

### Low Open Rate
1. Improve subject lines (A/B test)
2. Send at optimal times (Tue-Thu, 10am-2pm)
3. Personalize with customer name
4. Segment audience (don't blast everyone)
5. Check if emails landing in spam

### High Unsubscribe Rate
1. Reduce sending frequency
2. Improve content relevance
3. Segment audience better
4. Set expectations at signup
5. Make unsubscribe easy (don't hide it)

---

## 📞 Support Contacts

**Resend Support:**
- Email: support@resend.com
- Dashboard: https://resend.com/support
- Docs: https://resend.com/docs

**DNS/Domain Issues:**
- Contact your domain registrar
- Common registrars: GoDaddy, Namecheap, Cloudflare

**Email Deliverability Help:**
- Gmail Postmaster: https://postmaster.google.com/
- Mail Tester: https://www.mail-tester.com/
- MXToolbox: https://mxtoolbox.com/

---

## 💡 Pro Tips

1. **Warm up gradually:** Don't jump from 0 to 1000 emails/day
2. **Monitor constantly:** Check metrics daily for first month
3. **Test before blasting:** Send to yourself first
4. **Keep it simple:** Simple HTML performs better than complex designs
5. **Personalize:** Use customer name and relevant content
6. **Segment:** Don't send same email to everyone
7. **Time it right:** Tuesday-Thursday, 10am-2pm performs best
8. **Mobile first:** 60% of emails opened on mobile
9. **Clean regularly:** Remove inactive subscribers monthly
10. **Never buy lists:** Only send to people who opted in

---

## ✅ Implementation Status

Track your progress:

- [ ] DNS records configured
- [ ] Domain verified in Resend
- [ ] Plain text versions added to all emails
- [ ] Email headers improved
- [ ] Spam score checking implemented
- [ ] Email validation added
- [ ] Monitoring dashboard set up
- [ ] Email warm-up started
- [ ] Mail Tester score 9/10+
- [ ] Gmail Postmaster configured
- [ ] Team trained on best practices

---

**Last Updated:** February 8, 2026  
**Next Review:** Monthly

**Questions?** Refer to EMAIL_DELIVERABILITY_GUIDE.md for detailed explanations.
