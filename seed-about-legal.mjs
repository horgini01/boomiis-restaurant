import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Seeding About page and Legal pages content...\n');

try {
  // Seed About Content
  console.log('📝 Seeding About page content...');
  
  const aboutContent = [
    { sectionKey: 'hero_title', sectionValue: 'Our Story' },
    { sectionKey: 'hero_tagline', sectionValue: 'Bringing the vibrant flavors and warm hospitality of West Africa to your neighborhood since 2015' },
    { sectionKey: 'story_intro', sectionValue: 'Boomiis was born from a simple dream: to share the rich culinary heritage of West Africa with our community. What started as a small family kitchen has grown into a beloved restaurant where authentic flavors meet warm hospitality.' },
    { sectionKey: 'story_paragraph1', sectionValue: 'Our founder, Chef Emmanuel Adebayo, grew up in Lagos, Nigeria, where food was more than sustenance—it was a celebration of life, family, and culture. After moving to the UK, he noticed a gap: while African cuisine was gaining recognition, few places offered the authentic, home-cooked flavors he remembered from his childhood.' },
    { sectionKey: 'story_paragraph2', sectionValue: 'In 2015, Chef Emmanuel opened Boomiis with a mission to bring those authentic tastes to life. Every dish on our menu tells a story—from the perfectly spiced Jollof Rice to the rich, aromatic Egusi Soup. We source traditional ingredients, honor time-tested cooking methods, and infuse every meal with the love and care that defines West African hospitality. Today, Boomiis is more than a restaurant. It\'s a gathering place where families celebrate, friends reconnect, and newcomers discover the vibrant flavors of West Africa for the first time. We\'re proud to serve our community and share our culture, one delicious meal at a time.' },
  ];

  for (const content of aboutContent) {
    await db.insert(schema.aboutContent).values(content).onDuplicateKeyUpdate({
      set: { sectionValue: content.sectionValue }
    });
  }
  console.log('✅ About content seeded\n');

  // Seed Values
  console.log('💎 Seeding values...');
  
  const values = [
    {
      title: 'Authentic Flavors',
      description: 'We bring the true taste of West Africa to your table, using traditional recipes passed down through generations.',
      icon: 'Heart',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Fresh Ingredients',
      description: 'We source the finest ingredients, working with local suppliers and importing authentic spices directly from West Africa.',
      icon: 'Leaf',
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Community Focus',
      description: 'More than a restaurant, we are a gathering place for our community to celebrate culture, food, and togetherness.',
      icon: 'Users',
      displayOrder: 3,
      isActive: true,
    },
    {
      title: 'Excellence',
      description: 'Our commitment to quality and service has earned us recognition as one of the top African restaurants in the region.',
      icon: 'Award',
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const value of values) {
    await db.insert(schema.aboutValues).values(value);
  }
  console.log('✅ Values seeded\n');

  // Seed Team Members
  console.log('👥 Seeding team members...');
  
  const teamMembers = [
    {
      name: 'Chef Emmanuel Adebayo',
      title: 'Head Chef & Founder',
      bio: 'With over 20 years of culinary experience, Chef Emmanuel brings authentic West African flavors to life.',
      imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&q=80',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Amara Okafor',
      title: 'Restaurant Manager',
      bio: 'Amara ensures every guest feels welcome and enjoys an exceptional dining experience.',
      imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Kwame Mensah',
      title: 'Sous Chef',
      bio: 'Kwame specializes in traditional Ghanaian cuisine and brings creativity to our seasonal specials.',
      imageUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&q=80',
      displayOrder: 3,
      isActive: true,
    },
  ];

  for (const member of teamMembers) {
    await db.insert(schema.teamMembers).values(member);
  }
  console.log('✅ Team members seeded\n');

  // Seed Awards
  console.log('🏆 Seeding awards...');
  
  const awards = [
    {
      title: 'Best African Restaurant 2023',
      description: 'Local Food Awards',
      year: '2023',
      imageUrl: '',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Certificate of Excellence',
      description: 'TripAdvisor - 2022, 2023, 2024',
      year: '2024',
      imageUrl: '',
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Featured in "Hidden Gems of UK Dining"',
      description: 'The Guardian - 2023',
      year: '2023',
      imageUrl: '',
      displayOrder: 3,
      isActive: true,
    },
  ];

  for (const award of awards) {
    await db.insert(schema.awards).values(award);
  }
  console.log('✅ Awards seeded\n');

  // Seed Legal Pages
  console.log('⚖️  Seeding legal pages...');
  
  const legalPages = [
    {
      pageType: 'privacy-policy',
      title: 'Privacy Policy',
      content: `# Privacy Policy

Last Updated: ${new Date().toLocaleDateString()}

## Introduction

At Boomiis Restaurant, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.

## Information We Collect

### Personal Information
- **Contact Information**: Name, email address, phone number, and delivery address
- **Order Information**: Details about your orders, preferences, and special dietary requirements
- **Payment Information**: Payment card details (processed securely through our payment provider)
- **Account Information**: Username, password, and order history if you create an account

### Automatically Collected Information
- **Device Information**: IP address, browser type, operating system
- **Usage Data**: Pages visited, time spent on pages, links clicked
- **Cookies**: We use cookies to enhance your experience (see Cookie Policy below)

## How We Use Your Information

We use your information to:
- Process and fulfill your orders
- Communicate with you about your orders and our services
- Send promotional emails (with your consent)
- Improve our website and services
- Comply with legal obligations
- Prevent fraud and enhance security

## Information Sharing

We do not sell your personal information. We may share your information with:
- **Service Providers**: Payment processors, delivery partners, email service providers
- **Legal Requirements**: When required by law or to protect our rights
- **Business Transfers**: In connection with a merger, sale, or acquisition

## Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your information
- Opt-out of marketing communications
- Object to processing of your information

To exercise these rights, please contact us at [contact email].

## Data Security

We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.

## Cookies

We use cookies to:
- Remember your preferences
- Analyze website traffic
- Provide personalized content

You can control cookies through your browser settings.

## Children's Privacy

Our services are not directed to children under 13. We do not knowingly collect information from children under 13.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- Email: [contact email]
- Phone: [contact phone]
- Address: [restaurant address]`,
      isPublished: true,
    },
    {
      pageType: 'terms-conditions',
      title: 'Terms & Conditions',
      content: `# Terms & Conditions

Last Updated: ${new Date().toLocaleDateString()}

## Agreement to Terms

By accessing our website and placing an order with Boomiis Restaurant, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, please do not use our services.

## Orders and Payment

### Order Acceptance
- All orders are subject to acceptance and availability
- We reserve the right to refuse or cancel any order
- Prices are subject to change without notice

### Payment
- Payment is required at the time of order
- We accept major credit cards and debit cards
- All payments are processed securely through our payment provider

### Order Modifications
- Orders can be modified or cancelled within 5 minutes of placement
- After this time, orders cannot be cancelled or refunded as preparation has begun

## Delivery and Pickup

### Delivery
- Delivery times are estimates and not guaranteed
- Delivery is available to specified postcodes only
- Delivery fees vary by location
- You must be available to receive your order

### Pickup
- Pickup orders must be collected within 30 minutes of the scheduled time
- Valid ID may be required for age-restricted items

## Food Safety and Allergies

- We take food safety seriously and follow all health regulations
- Please inform us of any allergies or dietary requirements
- We cannot guarantee that our food is completely allergen-free
- Cross-contamination may occur in our kitchen

## Refunds and Complaints

- If you are unsatisfied with your order, please contact us immediately
- Refunds are issued at our discretion
- Complaints must be made within 24 hours of order receipt

## Intellectual Property

All content on our website, including text, images, logos, and designs, is the property of Boomiis Restaurant and protected by copyright laws.

## Limitation of Liability

To the fullest extent permitted by law, Boomiis Restaurant shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.

## Governing Law

These Terms and Conditions are governed by the laws of England and Wales.

## Changes to Terms

We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website.

## Contact Information

For questions about these Terms and Conditions, please contact us at:
- Email: [contact email]
- Phone: [contact phone]
- Address: [restaurant address]`,
      isPublished: true,
    },
    {
      pageType: 'accessibility',
      title: 'Accessibility Statement',
      content: `# Accessibility Statement

Last Updated: ${new Date().toLocaleDateString()}

## Our Commitment

Boomiis Restaurant is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines explain how to make web content more accessible for people with disabilities.

## Measures to Support Accessibility

Boomiis Restaurant takes the following measures to ensure accessibility:
- Include accessibility as part of our mission statement
- Provide ongoing accessibility training for our staff
- Assign clear accessibility goals and responsibilities
- Employ formal accessibility quality assurance methods

## Accessibility Features

Our website includes the following accessibility features:
- **Keyboard Navigation**: Full keyboard navigation support
- **Screen Reader Compatibility**: Compatible with popular screen readers
- **Text Alternatives**: Alt text for images
- **Clear Structure**: Proper heading hierarchy and semantic HTML
- **Color Contrast**: Sufficient color contrast ratios
- **Resizable Text**: Text can be resized without loss of functionality
- **Focus Indicators**: Visible focus indicators for keyboard navigation

## Known Limitations

Despite our best efforts, some limitations may exist:
- Some third-party content may not be fully accessible
- Older PDF documents may not meet current accessibility standards
- Some images from user-generated content may lack alt text

We are working to address these limitations.

## Physical Accessibility

Our restaurant location offers:
- Wheelchair-accessible entrance and dining area
- Accessible restrooms
- Large print menus available upon request
- Staff trained to assist customers with disabilities

## Feedback

We welcome your feedback on the accessibility of our website and services. Please contact us if you encounter accessibility barriers:

- **Email**: [contact email]
- **Phone**: [contact phone]
- **Address**: [restaurant address]

We aim to respond to accessibility feedback within 5 business days.

## Technical Specifications

Our website is designed to be compatible with:
- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Screen readers (JAWS, NVDA, VoiceOver)
- Mobile devices and tablets

## Assessment Approach

Boomiis Restaurant assesses the accessibility of our website through:
- Self-evaluation
- External accessibility audits
- User testing with people with disabilities
- Automated accessibility testing tools

## Formal Complaints

If you are not satisfied with our response to your accessibility concern, you may escalate your complaint to:
- [Relevant regulatory body or ombudsman]

## Updates

This accessibility statement was last reviewed on ${new Date().toLocaleDateString()}. We review and update this statement regularly as we make improvements to our website.`,
      isPublished: true,
    },
  ];

  for (const page of legalPages) {
    await db.insert(schema.legalPages).values(page).onDuplicateKeyUpdate({
      set: { 
        title: page.title,
        content: page.content,
        isPublished: page.isPublished,
      }
    });
  }
  console.log('✅ Legal pages seeded\n');

  console.log('🎉 All data seeded successfully!');
  
} catch (error) {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
} finally {
  await connection.end();
}
