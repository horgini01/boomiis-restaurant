import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Eye, RotateCcw, Save } from 'lucide-react';

const TEMPLATE_TYPES = [
  { value: 'order_confirmation', label: 'Order Confirmation (Customer)' },
  { value: 'reservation_confirmation', label: 'Reservation Confirmation (Customer)' },
  { value: 'admin_order_notification', label: 'New Order Notification (Admin)' },
  { value: 'order_preparing', label: 'Order Preparing (Customer)' },
  { value: 'order_ready_for_pickup', label: 'Order Ready for Pickup (Customer)' },
  { value: 'order_out_for_delivery', label: 'Order Out for Delivery (Customer)' },
  { value: 'order_completed', label: 'Order Completed (Customer)' },
  { value: 'weekly_report', label: 'Weekly Report (Admin)' },
  { value: 'testimonial_notification', label: 'New Testimonial Notification (Admin)' },
  { value: 'testimonial_response', label: 'Testimonial Response (Customer)' },
  { value: 'admin_user_welcome', label: 'New Admin User Welcome' },
  { value: 'event_confirmation', label: 'Event Confirmation (Customer)' },
  { value: 'event_inquiry_response', label: 'Event Inquiry Response (Customer)' },
  { value: 'catering_quote_request', label: 'Catering Quote Request (Admin)' },
  { value: 'review_request', label: 'Review Request (Customer)' },
  { value: 'reservation_reminder', label: 'Reservation Reminder (Customer)' },
  { value: 'order_cancellation', label: 'Order Cancellation (Customer)' },
  { value: 'newsletter_confirmation', label: 'Newsletter Subscription Confirmation' },
];

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

export default function EmailTemplatesEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('order_confirmation');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [headerColor, setHeaderColor] = useState('#d4a574');
  const [footerText, setFooterText] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { data: templates, isLoading, refetch } = trpc.admin.getEmailTemplates.useQuery();
  const saveTemplateMutation = trpc.admin.saveEmailTemplate.useMutation({
    onSuccess: () => {
      toast.success('Email template saved successfully');
      setHasChanges(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const sendTestEmailMutation = trpc.admin.sendTestEmail.useMutation({
    onSuccess: () => {
      toast.success(`Test email sent to ${testEmail}`);
      setTestEmail('');
      setIsSendingTest(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to send test email: ${error.message}`);
      setIsSendingTest(false);
    },
  });

  const handleSendTest = () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSendingTest(true);
    sendTestEmailMutation.mutate({
      templateType: selectedTemplate,
      recipientEmail: testEmail,
    });
  };

  // Pre-populate fields on initial load
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      handleTemplateChange(selectedTemplate);
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized, selectedTemplate]);

  // Load template when selection changes
  const handleTemplateChange = (templateType: string) => {
    setSelectedTemplate(templateType);
    const template = templates?.find((t: any) => t.templateType === templateType);
    
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml);
      setHeaderColor(template.headerColor);
      setFooterText(template.footerText || '');
    } else {
      // Load default template
      const defaultTemplate = DEFAULT_TEMPLATES[templateType as keyof typeof DEFAULT_TEMPLATES];
      setSubject(defaultTemplate.subject);
      setBodyHtml(defaultTemplate.bodyHtml);
      setHeaderColor(defaultTemplate.headerColor);
      setFooterText(defaultTemplate.footerText);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultTemplate = DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES];
    setSubject(defaultTemplate.subject);
    setBodyHtml(defaultTemplate.bodyHtml);
    setHeaderColor(defaultTemplate.headerColor);
    setFooterText(defaultTemplate.footerText);
    setHasChanges(true);
    toast.info('Template reset to default');
  };

  const handleSave = () => {
    saveTemplateMutation.mutate({
      templateType: selectedTemplate,
      subject,
      bodyHtml,
      headerColor,
      footerText,
    });
  };

  const generatePreviewHtml = () => {
    // Replace placeholders with sample data
    let preview = bodyHtml
      .replace(/{customerName}/g, 'John Smith')
      .replace(/{orderNumber}/g, 'BO-PREVIEW-001')
      .replace(/{orderType}/g, 'Delivery')
      .replace(/{scheduledTime}/g, 'Feb 1, 2026 7:00 PM')
      .replace(/{deliveryAddress}/g, '123 High Street, London, SW1A 1AA')
      .replace(/{itemsList}/g, '<ul><li>1x Jollof Rice with Chicken - £12.99</li><li>1x Fried Plantain - £3.99</li></ul>')
      .replace(/{subtotal}/g, '16.98')
      .replace(/{deliveryFee}/g, '3.99')
      .replace(/{total}/g, '20.97')
      .replace(/{restaurantName}/g, 'Boomiis Restaurant')
      .replace(/{reservationDateTime}/g, 'Feb 5, 2026 7:30 PM')
      .replace(/{partySize}/g, '4')
      .replace(/{specialRequests}/g, 'Window seat preferred')
      .replace(/{customerEmail}/g, 'john@example.com')
      .replace(/{customerPhone}/g, '07123456789');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${headerColor}; color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .content h2, .content h3, .content h4 { color: ${headerColor}; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .total { font-size: 1.2em; font-weight: bold; color: ${headerColor}; }
            .footer { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${subject.replace(/{orderNumber}/g, 'BO-PREVIEW-001').replace(/{total}/g, '20.97').replace(/{restaurantName}/g, 'Boomiis Restaurant')}</h1>
            </div>
            <div class="content">
              ${preview}
            </div>
            <div class="footer">
              ${footerText || 'Boomiis Restaurant - Authentic African Cuisine'}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📧 Email Templates Editor</CardTitle>
        <CardDescription>
          Customize email subject lines, body content, colors, and footer text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div>
          <Label htmlFor="template-type">Template Type</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger id="template-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Line */}
        <div>
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter email subject line"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{customerName}'}, {'{orderNumber}'}, {'{total}'}, {'{restaurantName}'}
          </p>
        </div>

        {/* Header Color */}
        <div>
          <Label htmlFor="header-color">Header Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="header-color"
              type="color"
              value={headerColor}
              onChange={(e) => {
                setHeaderColor(e.target.value);
                setHasChanges(true);
              }}
              className="w-20 h-10"
            />
            <Input
              value={headerColor}
              onChange={(e) => {
                setHeaderColor(e.target.value);
                setHasChanges(true);
              }}
              placeholder="#d4a574"
              className="flex-1"
            />
          </div>
        </div>

        {/* Body HTML */}
        <div>
          <Label htmlFor="body-html">Email Body (HTML)</Label>
          <Textarea
            id="body-html"
            value={bodyHtml}
            onChange={(e) => {
              setBodyHtml(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter email body HTML"
            rows={15}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{customerName}'}, {'{orderNumber}'}, {'{orderType}'}, {'{scheduledTime}'}, 
            {'{deliveryAddress}'}, {'{itemsList}'}, {'{subtotal}'}, {'{deliveryFee}'}, {'{total}'}, etc.
          </p>
        </div>

        {/* Footer Text */}
        <div>
          <Label htmlFor="footer-text">Footer Text</Label>
          <Textarea
            id="footer-text"
            value={footerText}
            onChange={(e) => {
              setFooterText(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter footer text"
            rows={3}
          />
        </div>

        {/* Send Test Email */}
        <div className="border-t pt-6">
          <Label htmlFor="test-email" className="text-base font-semibold">📨 Send Test Email</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Send a test email to your inbox to see how it looks in Gmail, Outlook, and mobile clients
          </p>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="flex-1"
            />
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmail}
              className="gap-2"
            >
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '📧'
              )}
              Send Test
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveTemplateMutation.isPending}
            className="gap-2"
          >
            {saveTemplateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto">
              <iframe
                srcDoc={generatePreviewHtml()}
                className="w-full h-[600px] border rounded"
                title="Email Preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
