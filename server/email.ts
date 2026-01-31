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
  customerPhone: string;
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
