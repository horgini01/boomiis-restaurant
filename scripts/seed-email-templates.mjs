import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { emailTemplates } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DEFAULT_TEMPLATES = {
  order_confirmation: {
    subject: '✅ Order Confirmation - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for your order! We look forward to serving you.',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Thank you for your order! We've received your payment and are preparing your delicious meal.</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Scheduled For:</strong> {scheduledTime}</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>

<h4>Items:</h4>
{itemsList}

<p><strong>Subtotal:</strong> £{subtotal}</p>
<p><strong>Delivery Fee:</strong> £{deliveryFee}</p>
<p class="total"><strong>Total:</strong> £{total}</p>

<p>We'll notify you when your order is ready for delivery.</p>`,
  },
  reservation_confirmation: {
    subject: '📅 Reservation Confirmed - {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'We look forward to welcoming you!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your reservation has been confirmed!</p>

<h3>Reservation Details</h3>
<p><strong>Date & Time:</strong> {reservationDateTime}</p>
<p><strong>Party Size:</strong> {partySize} guests</p>
<p><strong>Special Requests:</strong> {specialRequests}</p>

<p>If you need to modify or cancel your reservation, please contact us at least 24 hours in advance.</p>`,
  },
  admin_order_notification: {
    subject: '🔔 New Order #{orderNumber} - £{total}',
    headerColor: '#d4a574',
    footerText: 'Boomiis Restaurant Admin Panel',
    bodyHtml: `<div class="alert">
  <strong>Action Required:</strong> A new order has been placed and payment confirmed.
</div>

<h2>Order #{orderNumber}</h2>
<p><strong>Customer:</strong> {customerName}</p>
<p><strong>Email:</strong> {customerEmail}</p>
<p><strong>Phone:</strong> {customerPhone}</p>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>

<h3>Items:</h3>
{itemsList}

<p><strong>Subtotal:</strong> £{subtotal}</p>
<p><strong>Delivery Fee:</strong> £{deliveryFee}</p>
<p class="total"><strong>Total:</strong> £{total}</p>

<p><strong>Next Steps:</strong></p>
<ol>
  <li>Confirm the order in the admin panel</li>
  <li>Begin preparing the order</li>
  <li>Update order status as it progresses</li>
</ol>`,
  },
  order_preparing: {
    subject: '👨‍🍳 Your Order is Being Prepared - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for your patience!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Great news! Our chefs are now preparing your order.</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Preparing</p>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Scheduled For:</strong> {scheduledTime}</p>

<p>We'll notify you as soon as your order is ready!</p>`,
  },
  order_ready_for_pickup: {
    subject: '✅ Your Order is Ready for Pickup - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'We look forward to seeing you!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order is ready for pickup!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Ready for Pickup</p>
<p><strong>Pickup Address:</strong> {restaurantAddress}</p>

<p>Please collect your order at your earliest convenience. If you have any questions, feel free to contact us.</p>`,
  },
  order_out_for_delivery: {
    subject: '🚗 Your Order is Out for Delivery - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Your meal is on its way!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order is now out for delivery and will arrive soon!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Out for Delivery</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>
<p><strong>Estimated Arrival:</strong> {estimatedArrival}</p>

<p>Please ensure someone is available to receive the order.</p>`,
  },
  order_completed: {
    subject: '🎉 Order Delivered - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for choosing us! We hope to serve you again soon.',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order has been successfully delivered!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Completed</p>
<p><strong>Delivered At:</strong> {deliveredTime}</p>

<p>We hope you enjoyed your meal! If you have any feedback or concerns, please don't hesitate to contact us.</p>

<p>Thank you for your order!</p>`,
  },
  weekly_report: {
    subject: '📊 Weekly Report - {startDate} to {endDate}',
    headerColor: '#3b82f6',
    footerText: 'Boomiis Restaurant Analytics',
    bodyHtml: `<h2>Weekly Performance Summary</h2>
<p><strong>Report Period:</strong> {startDate} to {endDate}</p>

<h3>📈 Key Metrics</h3>
<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p><strong>Total Revenue:</strong> £{totalRevenue}</p>
  <p><strong>Total Orders:</strong> {totalOrders}</p>
  <p><strong>Average Order Value:</strong> £{avgOrderValue}</p>
  <p><strong>Total Reservations:</strong> {totalReservations}</p>
</div>

<h3>🎯 Top Performers</h3>
<p><strong>Best Selling Item:</strong> {topItem} ({topItemSales} sold)</p>
<p><strong>Busiest Day:</strong> {busiestDay} ({busiestDayOrders} orders)</p>
<p><strong>Peak Hour:</strong> {peakHour}</p>

<h3>👥 Customer Insights</h3>
<p><strong>New Customers:</strong> {newCustomers}</p>
<p><strong>Repeat Customers:</strong> {repeatCustomers}</p>
<p><strong>Repeat Rate:</strong> {repeatRate}</p>

<h3>⚠️ Alerts</h3>
<p><strong>Pending Testimonials:</strong> {pendingTestimonials}</p>
<p><strong>Unconfirmed Reservations:</strong> {unconfirmedReservations}</p>
<p><strong>Never Ordered Items:</strong> {neverOrderedCount}</p>

<p style="margin-top: 20px;">View detailed analytics in the <a href="{dashboardUrl}">admin dashboard</a>.</p>`,
  },
  testimonial_notification: {
    subject: '⭐ New Testimonial Received - {restaurantName}',
    headerColor: '#10b981',
    footerText: 'Thank you for providing excellent service!',
    bodyHtml: `<h2>New Customer Testimonial</h2>
<p>A customer has shared their experience at {restaurantName}!</p>

<div style="background: #f0fdf4; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
  <p><strong>Customer:</strong> {customerName}</p>
  <p><strong>Rating:</strong> {rating}/5 ⭐</p>
  <p><strong>Date:</strong> {submittedDate}</p>
  
  <h3>Testimonial:</h3>
  <p style="font-style: italic;">"{testimonialText}"</p>
</div>

<p><strong>Next Steps:</strong></p>
<ul>
  <li>Review the testimonial in the <a href="{adminUrl}">admin panel</a></li>
  <li>Approve or respond to the testimonial</li>
  <li>Consider featuring it on your website</li>
</ul>`,
  },
  testimonial_response: {
    subject: 'Thank You for Your Feedback - {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'We appreciate your support!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Thank you so much for taking the time to share your experience with us!</p>

<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Our Response:</strong></p>
  <p>{responseText}</p>
</div>

<p>Your feedback helps us continue to improve and serve you better. We look forward to welcoming you back soon!</p>`,
  },
  admin_user_welcome: {
    subject: 'Welcome to {restaurantName} Admin Team',
    headerColor: '#6366f1',
    footerText: 'Welcome aboard!',
    bodyHtml: `<h2>Welcome to the Team!</h2>
<p>Dear {userName},</p>
<p>You've been added as an admin user for {restaurantName}. Here are your account details:</p>

<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Email:</strong> {userEmail}</p>
  <p><strong>Role:</strong> {userRole}</p>
  <p><strong>Login URL:</strong> <a href="{loginUrl}">{loginUrl}</a></p>
</div>

<h3>Getting Started</h3>
<p>As an admin user, you'll have access to:</p>
<ul>
  <li>Order management and kitchen display</li>
  <li>Reservation and event bookings</li>
  <li>Menu and content management</li>
  <li>Customer communications</li>
  <li>Analytics and reports</li>
</ul>

<p>If you have any questions, please contact the restaurant owner or your manager.</p>`,
  },
  event_confirmation: {
    subject: '🎉 Event Booking Confirmed - {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'We look forward to hosting your event!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your event booking has been confirmed!</p>

<h3>Event Details</h3>
<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Event Type:</strong> {eventType}</p>
  <p><strong>Date & Time:</strong> {eventDateTime}</p>
  <p><strong>Number of Guests:</strong> {guestCount}</p>
  <p><strong>Venue:</strong> {venueName}</p>
</div>

<h3>Package Details</h3>
<p>{packageDetails}</p>

<h3>Special Requests</h3>
<p>{specialRequests}</p>

<p><strong>Total Cost:</strong> £{totalCost}</p>

<p>If you need to make any changes, please contact us at least 7 days before the event.</p>`,
  },
  event_inquiry_response: {
    subject: 'Thank You for Your Event Inquiry - {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'Let us help make your event special!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Thank you for your interest in hosting your event at {restaurantName}!</p>

<h3>Your Inquiry</h3>
<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Event Type:</strong> {eventType}</p>
  <p><strong>Preferred Date:</strong> {preferredDate}</p>
  <p><strong>Guest Count:</strong> {guestCount}</p>
</div>

<p>We've received your inquiry and our events team will contact you within 24 hours to discuss:</p>
<ul>
  <li>Available dates and venues</li>
  <li>Menu options and packages</li>
  <li>Pricing and customization</li>
  <li>Any special requirements</li>
</ul>

<p>In the meantime, if you have any questions, feel free to reach out to us.</p>`,
  },
  catering_quote_request: {
    subject: '📋 New Catering Quote Request',
    headerColor: '#f59e0b',
    footerText: 'Respond promptly to secure the booking',
    bodyHtml: `<h2>New Catering Quote Request</h2>
<p>A customer has requested a catering quote.</p>

<h3>Customer Information</h3>
<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Name:</strong> {customerName}</p>
  <p><strong>Email:</strong> {customerEmail}</p>
  <p><strong>Phone:</strong> {customerPhone}</p>
</div>

<h3>Event Details</h3>
<p><strong>Event Type:</strong> {eventType}</p>
<p><strong>Event Date:</strong> {eventDate}</p>
<p><strong>Guest Count:</strong> {guestCount}</p>
<p><strong>Budget Range:</strong> {budgetRange}</p>

<h3>Requirements</h3>
<p>{requirements}</p>

<p><strong>Action Required:</strong> Prepare and send a detailed quote within 24 hours.</p>`,
  },
  review_request: {
    subject: 'How Was Your Experience at {restaurantName}?',
    headerColor: '#d4a574',
    footerText: 'Your feedback matters to us!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Thank you for dining with us recently! We hope you enjoyed your meal.</p>

<div style="text-align: center; padding: 30px 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0;">
  <h3>Share Your Experience</h3>
  <p>Your feedback helps us improve and helps others discover great food!</p>
  <a href="{reviewUrl}" style="display: inline-block; background: #d4a574; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 15px;">Leave a Review</a>
</div>

<p>It only takes a minute, and we'd love to hear about:</p>
<ul>
  <li>The quality of your meal</li>
  <li>Our service and atmosphere</li>
  <li>Any suggestions for improvement</li>
</ul>

<p>Thank you for being a valued customer!</p>`,
  },
  reservation_reminder: {
    subject: '📅 Reminder: Your Reservation Tomorrow at {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'We look forward to seeing you!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>This is a friendly reminder about your upcoming reservation.</p>

<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <h3>Your Reservation</h3>
  <p><strong>Date & Time:</strong> {reservationDateTime}</p>
  <p><strong>Party Size:</strong> {partySize} guests</p>
  <p><strong>Table:</strong> {tableNumber}</p>
</div>

<p><strong>Our Address:</strong><br>
{restaurantAddress}</p>

<p>If you need to modify or cancel your reservation, please contact us at least 4 hours in advance.</p>

<p>We're excited to serve you!</p>`,
  },
  order_cancellation: {
    subject: 'Order Cancelled - #{orderNumber}',
    headerColor: '#ef4444',
    footerText: 'We hope to serve you again soon',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order has been cancelled as requested.</p>

<h3>Cancelled Order Details</h3>
<div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Order Number:</strong> #{orderNumber}</p>
  <p><strong>Order Total:</strong> £{orderTotal}</p>
  <p><strong>Cancellation Reason:</strong> {cancellationReason}</p>
</div>

<h3>Refund Information</h3>
<p>If you've already paid for this order, a refund will be processed within 5-7 business days to your original payment method.</p>

<p>If you have any questions about this cancellation, please don't hesitate to contact us.</p>`,
  },
  newsletter_confirmation: {
    subject: '✅ Welcome to {restaurantName} Newsletter!',
    headerColor: '#10b981',
    footerText: 'Stay connected with us!',
    bodyHtml: `<h2>Welcome to Our Newsletter!</h2>
<p>Dear {subscriberName},</p>
<p>Thank you for subscribing to the {restaurantName} newsletter!</p>

<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>What to Expect:</h3>
  <ul>
    <li>🍽️ Exclusive menu previews and seasonal specials</li>
    <li>🎉 Early access to event announcements</li>
    <li>💰 Special offers and discounts for subscribers</li>
    <li>📰 Restaurant news and updates</li>
  </ul>
</div>

<p>We promise to only send you valuable content - no spam, ever!</p>

<p style="font-size: 12px; color: #6b7280; margin-top: 30px;">You can unsubscribe at any time by clicking the link at the bottom of our emails.</p>`,
  },
};

async function seedEmailTemplates() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('[Seed] Starting email templates seeding...');
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const [templateType, template] of Object.entries(DEFAULT_TEMPLATES)) {
    try {
      // Check if template exists
      const existing = await db.select()
        .from(emailTemplates)
        .where(eq(emailTemplates.templateType, templateType))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Seed] Template "${templateType}" already exists, skipping...`);
        skipped++;
        continue;
      }

      // Insert new template
      await db.insert(emailTemplates).values({
        templateType,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        headerColor: template.headerColor,
        footerText: template.footerText,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[Seed] ✅ Inserted template: ${templateType}`);
      inserted++;
    } catch (error) {
      console.error(`[Seed] ❌ Error inserting template "${templateType}":`, error.message);
    }
  }

  await connection.end();

  console.log('\n[Seed] Email templates seeding complete!');
  console.log(`  - Inserted: ${inserted}`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Total: ${Object.keys(DEFAULT_TEMPLATES).length}`);
}

seedEmailTemplates().catch((error) => {
  console.error('[Seed] Fatal error:', error);
  process.exit(1);
});
