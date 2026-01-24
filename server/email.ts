import { Resend } from 'resend';
import { ENV } from './_core/env';

// Email configuration
const FROM_EMAIL = ENV.fromEmail || 'Boomiis Restaurant <orders@boomiis.com>';
const ADMIN_EMAIL = ENV.adminEmail || (ENV.ownerName ? `${ENV.ownerName} <admin@boomiis.com>` : 'admin@boomiis.com');

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn('[Email] Resend API key not configured. Email notifications are disabled.');
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(ENV.resendApiKey);
  }
  
  return resendClient;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderType: 'delivery' | 'pickup';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress?: string;
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
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
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
            .total { font-size: 1.2em; font-weight: bold; color: #d4a574; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${data.customerName},</p>
              <p>Thank you for your order! We've received your payment and are preparing your delicious West African cuisine.</p>
              
              <div class="order-details">
                <h2>Order #${data.orderNumber}</h2>
                <p><strong>Order Type:</strong> ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                ${data.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>` : ''}
                
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
      subject: `Order Confirmation - #${data.orderNumber}`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send order confirmation:', error);
      return { success: false, error };
    }

    console.log('[Email] Order confirmation sent:', result?.id);
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

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔔 New Order #${data.orderNumber} - £${data.total.toFixed(2)}`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send admin order notification:', error);
      return { success: false, error };
    }

    console.log('[Email] Admin order notification sent:', result?.id);
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
            .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Confirmed</h1>
            </div>
            <div class="content">
              <p>Dear ${data.customerName},</p>
              <p>Your table reservation has been confirmed! We look forward to welcoming you to Boomiis Restaurant.</p>
              
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
      subject: `Reservation Confirmed - ${formattedDate} at ${data.time}`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send reservation confirmation:', error);
      return { success: false, error };
    }

    console.log('[Email] Reservation confirmation sent:', result?.id);
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
