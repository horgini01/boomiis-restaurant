import { Resend } from 'resend';
import { ENV } from './_core/env';
import { getDb } from './db';
import { siteSettings, deliveryAreas } from '../drizzle/schema';
import { generateOrderReceiptPDF } from './pdf-receipt';

// Email configuration
export const FROM_EMAIL = ENV.fromEmail || 'Boomiis Restaurant <orders@boomiis.com>';
const ADMIN_EMAIL = ENV.adminEmail || (ENV.ownerName ? `${ENV.ownerName} <admin@boomiis.com>` : 'admin@boomiis.com');

// Fetch restaurant settings for email templates
async function getRestaurantSettings() {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const settings = await db.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.settingKey] = s.settingValue;
    });
    return settingsMap;
  } catch (error) {
    console.error('[Email] Failed to fetch settings:', error);
    return null;
  }
}

// Get admin emails from settings or fallback to default
async function getAdminEmails(): Promise<string[]> {
  try {
    const settings = await getRestaurantSettings();
    if (settings && settings.admin_emails) {
      const emails = settings.admin_emails.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length > 0) {
        return emails;
      }
    }
  } catch (error) {
    console.error('[Email] Failed to fetch admin emails:', error);
  }
  // Fallback to default admin email
  return [ADMIN_EMAIL];
}

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn('[Email] Resend API key not configured. Email notifications are disabled.');
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(ENV.resendApiKey);
  }
  
  return resendClient;
}

// Fetch custom email template from database
async function getCustomTemplate(templateType: string): Promise<{
  subject: string;
  bodyHtml: string;
  headerColor: string;
  footerText: string;
} | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const { emailTemplates } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    
    const templates = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.templateType, templateType))
      .limit(1);

    if (templates.length > 0 && templates[0].isActive) {
      return {
        subject: templates[0].subject,
        bodyHtml: templates[0].bodyHtml,
        headerColor: templates[0].headerColor,
        footerText: templates[0].footerText || '',
      };
    }

    return null;
  } catch (error) {
    console.error('[Email] Failed to fetch custom template:', error);
    return null;
  }
}

// Log email to database for tracking
async function logEmail({
  templateType,
  recipientEmail,
  recipientName,
  subject,
  resendId,
  metadata,
}: {
  templateType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  resendId?: string;
  metadata?: any;
}) {
  try {
    const db = await getDb();
    if (!db) return;

    const { emailLogs } = await import('../drizzle/schema');
    await db.insert(emailLogs).values({
      templateType,
      recipientEmail,
      recipientName: recipientName || null,
      subject,
      resendId: resendId || null,
      status: 'sent',
      sentAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    console.log(`[Email] Logged email to ${recipientEmail} (${templateType})`);
  } catch (error) {
    console.error('[Email] Failed to log email:', error);
  }
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  scheduledFor?: Date | string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress?: string;
  deliveryPostcode?: string;
  specialInstructions?: string;
  paymentIntentId?: string;
}

interface ReservationEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: Date;
  time: string;
  guests: number;
  specialRequests?: string;
}

/**
 * Get delivery areas for email footer
 */
async function getDeliveryAreasText(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return '';
    
    const areas = await db.select().from(deliveryAreas).orderBy(deliveryAreas.displayOrder);
    if (areas.length === 0) return '';
    
    const areasList = areas.map((a: { areaName: string; postcodesPrefixes: string }) => `${a.areaName} (${a.postcodesPrefixes})`).join(', ');
    return `<p>🚚 We Deliver To: ${areasList}</p>`;
  } catch (error) {
    console.error('Error fetching delivery areas for email:', error);
    return '';
  }
}

/**
 * Generate order confirmation email HTML
 */
export async function generateOrderConfirmationEmailHTML(data: OrderEmailData): Promise<string> {
  // Check for custom template first
  const customTemplate = await getCustomTemplate('order_confirmation');
  
  // Fetch restaurant settings
  const settings = await getRestaurantSettings();
  const restaurantName = settings?.restaurant_name || 'Boomiis Restaurant';
  let restaurantLogo = settings?.restaurant_logo || '';
  const restaurantTagline = settings?.restaurant_tagline || 'Authentic West African Cuisine';
  const contactAddress = settings?.contact_address || '123 High Street, London, UK SW1A 1AA';
  const contactPhone = settings?.contact_phone || '+44 20 1234 5678';
  const contactEmail = settings?.contact_email || 'hello@boomiis.uk';

  // Convert relative logo path to absolute URL for emails
  if (restaurantLogo && restaurantLogo.startsWith('/')) {
    restaurantLogo = `${ENV.baseUrl}${restaurantLogo}`;
  }

  const itemsList = data.items
    .map(item => `<li>${item.quantity}x ${item.name} - £${item.price.toFixed(2)}</li>`)
    .join('');

  // Get delivery areas text
  const deliveryAreasText = await getDeliveryAreasText();

  // If custom template exists, use it
  if (customTemplate) {
    const scheduledTime = data.scheduledFor 
      ? new Date(data.scheduledFor).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'To be confirmed';
    
    let customBody = customTemplate.bodyHtml
      .replace(/{customerName}/g, data.customerName)
      .replace(/{orderNumber}/g, data.orderNumber)
      .replace(/{orderType}/g, data.orderType === 'delivery' ? 'Delivery' : 'Pickup')
      .replace(/{scheduledTime}/g, scheduledTime)
      .replace(/{deliveryAddress}/g, data.deliveryAddress || 'N/A')
      .replace(/{itemsList}/g, itemsList)
      .replace(/{subtotal}/g, data.subtotal.toFixed(2))
      .replace(/{deliveryFee}/g, data.deliveryFee.toFixed(2))
      .replace(/{total}/g, data.total.toFixed(2))
      .replace(/{restaurantName}/g, restaurantName);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${customTemplate.headerColor}; color: white; padding: 30px 20px; text-align: center; }
            .header img { max-height: 60px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .content h2, .content h3, .content h4 { color: ${customTemplate.headerColor}; }
            .total { font-size: 1.2em; font-weight: bold; color: ${customTemplate.headerColor}; }
            .footer { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${restaurantLogo ? `<img src="${restaurantLogo}" alt="${restaurantName}" />` : ''}
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              ${customBody}
            </div>
            <div class="footer">
              ${customTemplate.footerText}
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #555;">
                <p><strong>${restaurantName}</strong></p>
                <p>📍 ${contactAddress}</p>
                <p>📞 ${contactPhone}</p>
                <p>✉️ ${contactEmail}</p>
                ${deliveryAreasText}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Otherwise use default template

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d4a574; color: white; padding: 30px 20px; text-align: center; }
          .header img { max-height: 60px; margin-bottom: 15px; }
          .content { background: #f9f9f9; padding: 20px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .total { font-size: 1.2em; font-weight: bold; color: #d4a574; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; border-top: 1px solid #ddd; margin-top: 20px; }
          .footer-contact { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${restaurantLogo ? `<img src="${restaurantLogo}" alt="${restaurantName}" />` : ''}
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Thank you for your order! We've received your payment and are preparing your delicious meal.</p>
            
            <div class="order-details">
              <h2>Order #${data.orderNumber}</h2>
              <p><strong>Order Type:</strong> ${data.orderType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</p>
              ${data.scheduledFor ? `<p><strong>${data.orderType === 'delivery' ? '⏰ Estimated Delivery:' : '⏰ Pickup Time:'}</strong> ${new Date(data.scheduledFor).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
              <p><strong>Contact Phone:</strong> ${data.customerPhone}</p>
              ${data.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${data.deliveryAddress}${data.deliveryPostcode ? `, ${data.deliveryPostcode}` : ''}</p>` : ''}
              ${data.specialInstructions ? `<p><strong>Special Instructions:</strong> ${data.specialInstructions}</p>` : ''}
              
              <h3>Items:</h3>
              <ul>
                ${itemsList}
              </ul>
              
              <p><strong>Subtotal:</strong> £${data.subtotal.toFixed(2)}</p>
              ${data.deliveryFee > 0 ? `<p><strong>Delivery Fee:</strong> £${data.deliveryFee.toFixed(2)}</p>` : ''}
              <p class="total">Total: £${data.total.toFixed(2)}</p>
              
              ${data.paymentIntentId ? `<p style="font-size: 0.9em; color: #666;">Payment ID: ${data.paymentIntentId}</p>` : ''}
            </div>
            
            <p>We'll notify you when your order is ready ${data.orderType === 'delivery' ? 'for delivery' : 'for pickup'}.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p><strong>${restaurantName}</strong></p>
            <p style="font-style: italic; color: #888;">${restaurantTagline}</p>
            <div class="footer-contact">
              <p>📍 ${contactAddress}</p>
              <p>📞 ${contactPhone}</p>
              <p>✉️ ${contactEmail}</p>
              ${deliveryAreasText}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const html = await generateOrderConfirmationEmailHTML(data);
    
    // Get custom subject line if available
    const customTemplate = await getCustomTemplate('order_confirmation');
    let subject = `Order Confirmation - #${data.orderNumber}`;
    if (customTemplate) {
      subject = customTemplate.subject
        .replace(/{orderNumber}/g, data.orderNumber)
        .replace(/{customerName}/g, data.customerName)
        .replace(/{total}/g, data.total.toFixed(2))
        .replace(/{restaurantName}/g, 'Boomiis Restaurant');
    }

    // Generate PDF receipt
    const pdfBuffer = await generateOrderReceiptPDF({
      orderId: data.orderNumber,
      orderNumber: data.orderNumber,
      orderDate: new Date(),
      orderType: data.orderType,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone || '',
      deliveryAddress: data.deliveryAddress,
      postcode: data.deliveryPostcode,
      scheduledFor: typeof data.scheduledFor === 'string' ? new Date(data.scheduledFor) : data.scheduledFor,
      items: data.items,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      total: data.total,
      paymentStatus: 'Paid',
    });

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject,
      html,
      attachments: [
        {
          filename: `receipt-${data.orderNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('[Email] Failed to send order confirmation:', error);
      return { success: false, error };
    }

    console.log('[Email] Order confirmation sent:', result?.id);
    
    // Log email to database
    await logEmail({
      templateType: 'order_confirmation',
      recipientEmail: data.customerEmail,
      recipientName: data.customerName,
      subject: `Order Confirmation - #${data.orderNumber}`,
      resendId: result?.id,
      metadata: { orderId: data.orderNumber },
    });
    
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[Email] Error sending order confirmation:', error);
    return { success: false, error };
  }
}

/**
 * Send new order notification to admin
 */
export async function sendAdminOrderNotification(data: OrderEmailData) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const itemsList = data.items
      .map(item => `<li>${item.quantity}x ${item.name} - £${item.price.toFixed(2)}</li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d4a574; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
            .total { font-size: 1.2em; font-weight: bold; color: #d4a574; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Order Received</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>Action Required:</strong> A new order has been placed and payment confirmed.
              </div>
              
              <div class="order-details">
                <h2>Order #${data.orderNumber}</h2>
                <p><strong>Customer:</strong> ${data.customerName}</p>
                <p><strong>Email:</strong> ${data.customerEmail}</p>
                <p><strong>Order Type:</strong> ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                ${data.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>` : ''}
                
                <h3>Items:</h3>
                <ul>
                  ${itemsList}
                </ul>
                
                <p><strong>Subtotal:</strong> £${data.subtotal.toFixed(2)}</p>
                ${data.deliveryFee > 0 ? `<p><strong>Delivery Fee:</strong> £${data.deliveryFee.toFixed(2)}</p>` : ''}
                <p class="total">Total: £${data.total.toFixed(2)}</p>
                
                ${data.paymentIntentId ? `<p style="font-size: 0.9em; color: #666;">Stripe Payment ID: ${data.paymentIntentId}</p>` : ''}
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Confirm the order in the admin panel</li>
                <li>Begin preparing the order</li>
                <li>Update order status as it progresses</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `;

    // Get admin emails from settings
    const adminEmails = await getAdminEmails();
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails, // Send to all admin emails
      subject: `🔔 New Order #${data.orderNumber} - £${data.total.toFixed(2)}`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send admin order notification:', error);
      return { success: false, error };
    }

    console.log(`[Email] Admin order notification sent to ${adminEmails.length} recipient(s):`, result?.id);
    
    // Log email to database for each admin recipient
    for (const adminEmail of adminEmails) {
      await logEmail({
        templateType: 'admin_order_notification',
        recipientEmail: adminEmail,
        subject: `🔔 New Order #${data.orderNumber} - £${data.total.toFixed(2)}`,
        resendId: result?.id,
        metadata: { orderId: data.orderNumber },
      });
    }
    
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[Email] Error sending admin order notification:', error);
    return { success: false, error };
  }
}

/**
 * Send reservation confirmation email to customer
 */
export async function sendReservationConfirmationEmail(data: ReservationEmailData) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try{
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = await generateReservationConfirmationEmailHTML(data);
    
    // Get custom subject line if available
    const customTemplate = await getCustomTemplate('reservation_confirmation');
    let subject = `Reservation Confirmed - ${formattedDate} at ${data.time}`;
    if (customTemplate) {
      subject = customTemplate.subject
        .replace(/{customerName}/g, data.customerName)
        .replace(/{reservationDateTime}/g, `${formattedDate} at ${data.time}`)
        .replace(/{partySize}/g, data.guests.toString())
        .replace(/{restaurantName}/g, 'Boomiis Restaurant');
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send reservation confirmation:', error);
      return { success: false, error };
    }

    console.log('[Email] Reservation confirmation sent:', result?.id);
    
    // Log email to database
    await logEmail({
      templateType: 'reservation_confirmation',
      recipientEmail: data.customerEmail,
      recipientName: data.customerName,
      subject: `Reservation Confirmed - ${formattedDate} at ${data.time}`,
      resendId: result?.id,
      metadata: { reservationDate: data.date, reservationTime: data.time, guests: data.guests },
    });
    
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[Email] Error sending reservation confirmation:', error);
    return { success: false, error };
  }
}

/**
 * Send new reservation notification to admin
 */
export async function sendAdminReservationNotification(data: ReservationEmailData) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d4a574; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .reservation-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Reservation</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>New Reservation:</strong> A customer has booked a table.
              </div>
              
              <div class="reservation-details">
                <h2>Reservation Details</h2>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${data.time}</p>
                <p><strong>Number of Guests:</strong> ${data.guests}</p>
                <p><strong>Customer Name:</strong> ${data.customerName}</p>
                <p><strong>Email:</strong> ${data.customerEmail}</p>
                <p><strong>Phone:</strong> ${data.customerPhone}</p>
                ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Confirm table availability</li>
                <li>Update reservation status in admin panel</li>
                <li>Prepare for the guest's arrival</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔔 New Reservation - ${formattedDate} at ${data.time} (${data.guests} guests)`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send admin reservation notification:', error);
      return { success: false, error };
    }

    console.log('[Email] Admin reservation notification sent:', result?.id);
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[Email] Error sending admin reservation notification:', error);
    return { success: false, error };
  }
}

/**
 * Send order status update email to customer
 */
export async function sendOrderStatusUpdateEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  orderType: 'delivery' | 'pickup';
  scheduledFor?: Date | null;
}) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    // Status-specific messages
    const statusMessages: Record<string, { title: string; message: string; color: string }> = {
      confirmed: {
        title: 'Order Confirmed',
        message: 'Great news! Your order has been confirmed and we\'re getting started on it.',
        color: '#10b981',
      },
      preparing: {
        title: 'Order Being Prepared',
        message: 'Our chefs are now preparing your delicious West African dishes with care.',
        color: '#f59e0b',
      },
      ready: {
        title: `Order Ready for ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'}`,
        message: data.orderType === 'delivery' 
          ? 'Your order is ready and will be on its way to you shortly!' 
          : 'Your order is ready for pickup! Please come collect it at your convenience.',
        color: '#3b82f6',
      },
      completed: {
        title: 'Order Completed',
        message: 'Thank you for dining with us! We hope you enjoyed your meal.',
        color: '#8b5cf6',
      },
      cancelled: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact us.',
        color: '#ef4444',
      },
    };

    const statusInfo = statusMessages[data.status] || {
      title: 'Order Status Updated',
      message: `Your order status has been updated to: ${data.status}`,
      color: '#6b7280',
    };

    const scheduledTimeText = data.scheduledFor 
      ? `<p><strong>Scheduled Time:</strong> ${new Date(data.scheduledFor).toLocaleString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}</p>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusInfo.color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
            .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .status-badge { display: inline-block; padding: 8px 16px; background: ${statusInfo.color}; color: white; border-radius: 20px; font-weight: bold; text-transform: capitalize; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.title}</h1>
            </div>
            <div class="content">
              <p>Dear ${data.customerName},</p>
              <p>${statusInfo.message}</p>
              
              <div class="order-details">
                <h2>Order #${data.orderNumber}</h2>
                <p><strong>Status:</strong> <span class="status-badge">${data.status}</span></p>
                <p><strong>Order Type:</strong> ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                ${scheduledTimeText}
              </div>
              
              ${data.status === 'ready' && data.orderType === 'pickup' ? `
                <p style="background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;">
                  <strong>📍 Pickup Location:</strong><br>
                  Boomiis Restaurant<br>
                  123 High Street, London, UK SW1A 1AA
                </p>
              ` : ''}
              
              <p>If you have any questions about your order, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>Boomiis Restaurant - Authentic West African Cuisine</p>
              <p>123 High Street, London, UK SW1A 1AA</p>
              <p>+44 20 1234 5678</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `${statusInfo.title} - Order #${data.orderNumber}`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send status update:', error);
      return { success: false, error };
    }

    console.log('[Email] Status update sent:', result?.id);
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[Email] Error sending status update:', error);
    return { success: false, error };
  }
}

interface DailySalesSummaryData {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  deliveryOrders: number;
  pickupOrders: number;
  popularItems: Array<{ name: string; count: number }>;
  averagePrepTime: number;
  pendingOrders: number;
}

export async function sendDailySalesSummaryEmail(data: DailySalesSummaryData): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Email] Skipping daily sales summary email - Resend not configured');
    return false;
  }

  const popularItemsList = data.popularItems
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.name} (${item.count} orders)`)
    .join('<br>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #d4a574; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-box { background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e0e0e0; }
        .stat-value { font-size: 24px; font-weight: bold; color: #d4a574; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .section { margin: 25px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 2px solid #d4a574; padding-bottom: 5px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📊 Daily Sales Summary</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${data.date}</p>
        </div>
        <div class="content">
          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-value">£${data.totalRevenue.toFixed(2)}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.totalOrders}</div>
              <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.deliveryOrders}</div>
              <div class="stat-label">Delivery Orders</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.pickupOrders}</div>
              <div class="stat-label">Pickup Orders</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🔥 Top 5 Popular Items</div>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
              ${popularItemsList || '<p style="color: #999;">No items sold today</p>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">⏱️ Performance Metrics</div>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
              <p><strong>Average Prep Time:</strong> ${data.averagePrepTime > 0 ? `${Math.round(data.averagePrepTime)} minutes` : 'N/A'}</p>
              <p><strong>Pending Orders:</strong> ${data.pendingOrders}</p>
              <p><strong>Average Order Value:</strong> £${data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toFixed(2) : '0.00'}</p>
            </div>
          </div>

          ${data.pendingOrders > 0 ? `
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Reminder:</strong> You have ${data.pendingOrders} pending order${data.pendingOrders > 1 ? 's' : ''} that need attention.</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>This is an automated daily sales summary from Boomiis Restaurant.</p>
            <p>You can disable these emails in your admin settings.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Daily Sales Summary - ${data.date}`,
      html: htmlContent,
    });
    console.log(`[Email] Daily sales summary sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send daily sales summary:', error);
    return false;
  }
}

/**
 * Generate sample email previews for admin
 */
export async function generateEmailPreviews() {
  // Sample order data
  const sampleOrderData: OrderEmailData = {
    orderNumber: 'BO-PREVIEW-001',
    customerName: 'John Smith',
    customerEmail: 'customer@example.com',
    customerPhone: '+44 7700 900000',
    orderType: 'delivery',
    items: [
      { name: 'Jollof Rice with Chicken', quantity: 2, price: 12.99 },
      { name: 'Fried Plantain', quantity: 1, price: 3.99 },
      { name: 'Suya Skewers', quantity: 1, price: 7.99 }
    ],
    subtotal: 37.96,
    deliveryFee: 3.99,
    total: 41.95,
    deliveryAddress: '123 Sample Street, London',
    deliveryPostcode: 'SW1A 1AA',
    specialInstructions: 'Please ring the doorbell twice',
    paymentIntentId: 'pi_sample_123456789'
  };

  // Sample reservation data
  const sampleReservationData: ReservationEmailData = {
    customerName: 'Jane Doe',
    customerEmail: 'customer@example.com',
    customerPhone: '+44 7700 900001',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    time: '19:00',
    guests: 4,
    specialRequests: 'Window seat if available'
  };

  // Generate HTML for all templates
  const orderConfirmationHTML = await generateOrderConfirmationEmailHTML(sampleOrderData);
  const reservationConfirmationHTML = await generateReservationConfirmationEmailHTML(sampleReservationData);
  const adminOrderNotificationHTML = await generateAdminOrderNotificationEmailHTML(sampleOrderData);

  return {
    orderConfirmation: orderConfirmationHTML,
    reservationConfirmation: reservationConfirmationHTML,
    adminOrderNotification: adminOrderNotificationHTML
  };
}

/**
 * Generate reservation confirmation email HTML
 */
export async function generateReservationConfirmationEmailHTML(data: ReservationEmailData): Promise<string> {
  // Check for custom template first
  const customTemplate = await getCustomTemplate('reservation_confirmation');
  
  // Fetch restaurant settings
  const settings = await getRestaurantSettings();
  const restaurantName = settings?.restaurant_name || 'Boomiis Restaurant';
  let restaurantLogo = settings?.restaurant_logo || '';
  const restaurantTagline = settings?.restaurant_tagline || 'Authentic West African Cuisine';
  const contactAddress = settings?.contact_address || '123 High Street, London, UK SW1A 1AA';
  const contactPhone = settings?.contact_phone || '+44 20 1234 5678';
  const contactEmail = settings?.contact_email || 'hello@boomiis.uk';

  // Convert relative logo path to absolute URL for emails
  if (restaurantLogo && restaurantLogo.startsWith('/')) {
    restaurantLogo = `${ENV.baseUrl}${restaurantLogo}`;
  }

  // Get delivery areas text
  const deliveryAreasText = await getDeliveryAreasText();

  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // If custom template exists, use it
  if (customTemplate) {
    let customBody = customTemplate.bodyHtml
      .replace(/{customerName}/g, data.customerName)
      .replace(/{reservationDateTime}/g, `${formattedDate} at ${data.time}`)
      .replace(/{partySize}/g, data.guests.toString())
      .replace(/{specialRequests}/g, data.specialRequests || 'None')
      .replace(/{customerEmail}/g, data.customerEmail)
      .replace(/{customerPhone}/g, data.customerPhone)
      .replace(/{restaurantName}/g, restaurantName);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${customTemplate.headerColor}; color: white; padding: 30px 20px; text-align: center; }
            .header img { max-height: 60px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .content h2, .content h3, .content h4 { color: ${customTemplate.headerColor}; }
            .footer { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${restaurantLogo ? `<img src="${restaurantLogo}" alt="${restaurantName}" />` : ''}
              <h1>Reservation Confirmed</h1>
            </div>
            <div class="content">
              ${customBody}
            </div>
            <div class="footer">
              ${customTemplate.footerText}
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #555;">
                <p><strong>${restaurantName}</strong></p>
                <p>📍 ${contactAddress}</p>
                <p>📞 ${contactPhone}</p>
                <p>✉️ ${contactEmail}</p>
                ${deliveryAreasText}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Otherwise use default template

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d4a574; color: white; padding: 30px 20px; text-align: center; }
          .header img { max-height: 60px; margin-bottom: 15px; }
          .content { background: #f9f9f9; padding: 20px; }
          .reservation-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; border-top: 1px solid #ddd; margin-top: 20px; }
          .footer-contact { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${restaurantLogo ? `<img src="${restaurantLogo}" alt="${restaurantName}" />` : ''}
            <h1>Reservation Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your table reservation has been confirmed! We look forward to welcoming you to ${restaurantName}.</p>
            
            <div class="reservation-details">
              <h2>Reservation Details</h2>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Number of Guests:</strong> ${data.guests}</p>
              <p><strong>Name:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> ${data.customerPhone}</p>
              ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
            </div>
            
            <p>Please arrive on time. If you need to modify or cancel your reservation, please contact us at least 24 hours in advance.</p>
          </div>
          <div class="footer">
            <p><strong>${restaurantName}</strong></p>
            <p style="font-style: italic; color: #888;">${restaurantTagline}</p>
            <div class="footer-contact">
              <p>📍 ${contactAddress}</p>
              <p>📞 ${contactPhone}</p>
              <p>✉️ ${contactEmail}</p>
              ${deliveryAreasText}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate admin order notification email HTML
 */
export async function generateAdminOrderNotificationEmailHTML(data: OrderEmailData): Promise<string> {
  const itemsList = data.items
    .map(item => `<li>${item.quantity}x ${item.name} - £${item.price.toFixed(2)}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d4a574; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
          .total { font-size: 1.2em; font-weight: bold; color: #d4a574; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Order Received</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>Action Required:</strong> A new order has been placed and payment confirmed.
            </div>
            
            <div class="order-details">
              <h2>Order #${data.orderNumber}</h2>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Email:</strong> ${data.customerEmail}</p>
              <p><strong>Phone:</strong> ${data.customerPhone}</p>
              <p><strong>Order Type:</strong> ${data.orderType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</p>
              ${data.scheduledFor ? `<p><strong>${data.orderType === 'delivery' ? '⏰ Estimated Delivery:' : '⏰ Pickup Time:'}</strong> ${new Date(data.scheduledFor).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
              ${data.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${data.deliveryAddress}${data.deliveryPostcode ? `, ${data.deliveryPostcode}` : ''}</p>` : ''}
              ${data.specialInstructions ? `<p><strong>Special Instructions:</strong> ${data.specialInstructions}</p>` : ''}
              
              <h3>Items:</h3>
              <ul>
                ${itemsList}
              </ul>
              
              <p><strong>Subtotal:</strong> £${data.subtotal.toFixed(2)}</p>
              ${data.deliveryFee > 0 ? `<p><strong>Delivery Fee:</strong> £${data.deliveryFee.toFixed(2)}</p>` : ''}
              <p class="total">Total: £${data.total.toFixed(2)}</p>
              
              ${data.paymentIntentId ? `<p style="font-size: 0.9em; color: #666;">Stripe Payment ID: ${data.paymentIntentId}</p>` : ''}
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Confirm the order in the admin panel</li>
              <li>Begin preparing the order</li>
              <li>Update order status as it progresses</li>
            </ol>
          </div>
        </div>
      </body>
    </html>
  `;
}
