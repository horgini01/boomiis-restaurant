import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { legalPages } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Check if cookie policy exists
const existing = await db.select().from(legalPages)
  .where(eq(legalPages.pageType, 'cookie-policy'));

if (existing.length > 0) {
  console.log('Cookie policy already exists');
  await conn.end();
  process.exit(0);
}

// Create cookie policy
await db.insert(legalPages).values({
  pageType: 'cookie-policy',
  title: 'Cookie Policy',
  content: `# Cookie Policy

Last Updated: ${new Date().toLocaleDateString()}

## What Are Cookies?

Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.

## How We Use Cookies

Boomiis Restaurant uses cookies for the following purposes:

### Essential Cookies (Required)

These cookies are necessary for the website to function properly and cannot be disabled:

- **Session Cookies**: Keep you logged in during your visit
- **Security Cookies**: Protect against fraudulent activity
- **Shopping Cart**: Remember items you've added to your cart
- **Order Processing**: Enable checkout and payment functionality

### Functional Cookies (Optional)

These cookies enhance your experience but are not essential:

- **Preference Cookies**: Remember your language, location, and display preferences
- **Authentication**: Keep you logged in between visits (if you select "Remember Me")
- **Form Data**: Save form inputs to prevent data loss

### Analytics Cookies (Optional)

These cookies help us understand how visitors use our website:

- **Google Analytics**: Track page views, session duration, and user behavior
- **Performance Monitoring**: Identify technical issues and improve site speed
- **A/B Testing**: Test different features to improve user experience

**Data Collected**: Page views, time on site, browser type, device type, referral source

### Marketing Cookies (Optional)

These cookies are used to deliver relevant advertisements:

- **Advertising Cookies**: Show you relevant ads on other websites
- **Social Media Cookies**: Enable sharing content on social platforms
- **Retargeting**: Show you ads for items you viewed on our site

**Third-Party Services**: Google Ads, Facebook Pixel, Instagram

## Your Cookie Choices

You have control over which cookies you accept:

### Managing Cookie Preferences

You can change your cookie preferences at any time by:
1. Clicking the "Cookie Settings" link in our website footer
2. Using your browser settings to block or delete cookies
3. Opting out of third-party advertising cookies

### Browser Settings

Most browsers allow you to:
- View and delete cookies
- Block all cookies
- Block third-party cookies only
- Clear cookies when you close the browser

**Note**: Blocking essential cookies may prevent you from using certain features of our website, such as placing orders or making reservations.

## Cookies We Use

| Cookie Name | Purpose | Type | Duration |
|------------|---------|------|----------|
| session_id | Keep you logged in | Essential | Session |
| cart_items | Remember your cart | Essential | 7 days |
| preferences | Store your settings | Functional | 1 year |
| _ga | Google Analytics | Analytics | 2 years |
| _fbp | Facebook Pixel | Marketing | 3 months |

## Third-Party Cookies

Some cookies are set by third-party services that appear on our pages:

- **Payment Providers**: Stripe sets cookies to process secure payments
- **Google Maps**: Used on our contact and delivery pages
- **Social Media**: Facebook, Instagram, Twitter for sharing features
- **Analytics**: Google Analytics for usage statistics

These third parties have their own privacy policies. We recommend reviewing them:
- [Stripe Privacy Policy](https://stripe.com/privacy)
- [Google Privacy Policy](https://policies.google.com/privacy)
- [Facebook Privacy Policy](https://www.facebook.com/privacy/policy)

## Cookie Consent

When you first visit our website, you'll see a cookie consent banner. You can:

- **Accept All**: Allow all cookies for the best experience
- **Reject Non-Essential**: Only use essential cookies
- **Customize**: Choose which types of cookies to allow

Your consent is stored for 12 months, after which you'll be asked again.

## Data Protection

All data collected through cookies is handled in accordance with:
- UK General Data Protection Regulation (UK GDPR)
- Data Protection Act 2018
- Privacy and Electronic Communications Regulations (PECR)

We never sell your personal data to third parties.

## Updates to This Policy

We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. The "Last Updated" date at the top of this page shows when it was last revised.

## Contact Us

If you have questions about our use of cookies, please contact us:

- **Email**: [contact email]
- **Phone**: [contact phone]
- **Address**: [restaurant address]

## More Information

For more information about cookies and how to manage them, visit:
- [About Cookies](https://www.aboutcookies.org/)
- [Your Online Choices](https://www.youronlinechoices.com/)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)`,
  isPublished: true,
});

console.log('Cookie policy created successfully');
await conn.end();
