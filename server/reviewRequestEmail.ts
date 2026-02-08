import { getResendClient, FROM_EMAIL } from './email';
import { htmlToPlainText, getEmailHeaders, isValidEmail } from './emailUtils';
import { ENV } from './_core/env';

interface ReviewRequestData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: Date;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

/**
 * Generate review request email HTML
 */
async function generateReviewRequestEmailHTML(data: ReviewRequestData): Promise<string> {
  const reviewUrl = `${ENV.baseUrl}/reviews?order=${data.orderNumber}`;
  const formattedDate = new Date(data.orderDate).toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const itemsList = data.items
    .map(item => `<li>${item.quantity}x ${item.name}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
          }
          .header { 
            background: linear-gradient(135deg, #d4a574 0%, #c89860 100%); 
            color: white; 
            padding: 40px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px; 
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
          }
          .message {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 25px;
            color: #555;
          }
          .order-summary {
            background: #f9f9f9;
            border-left: 4px solid #d4a574;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .order-summary h3 {
            margin: 0 0 15px 0;
            color: #d4a574;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .order-summary ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .order-summary li {
            margin: 5px 0;
            color: #666;
          }
          .order-info {
            font-size: 14px;
            color: #888;
            margin-top: 10px;
          }
          .cta-button {
            display: inline-block;
            background: #d4a574;
            color: white !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 6px;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            transition: background 0.3s ease;
          }
          .cta-button:hover {
            background: #c89860;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .stars {
            font-size: 32px;
            color: #ffd700;
            margin: 20px 0;
            text-align: center;
          }
          .benefits {
            background: #fff8f0;
            border: 1px solid #ffe4c4;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
          }
          .benefits h4 {
            margin: 0 0 15px 0;
            color: #d4a574;
            font-size: 16px;
          }
          .benefits ul {
            margin: 0;
            padding-left: 20px;
          }
          .benefits li {
            margin: 8px 0;
            color: #666;
          }
          .footer { 
            background: #333; 
            color: #fff; 
            padding: 30px 20px; 
            text-align: center; 
            font-size: 14px; 
          }
          .footer p {
            margin: 8px 0;
            opacity: 0.9;
          }
          .footer a {
            color: #d4a574;
            text-decoration: none;
          }
          .social-proof {
            text-align: center;
            padding: 20px;
            background: #f9f9f9;
            margin: 25px 0;
            border-radius: 6px;
          }
          .social-proof p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .social-proof strong {
            color: #d4a574;
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ How Was Your Experience?</h1>
            <p>We'd love to hear your feedback!</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hi ${data.customerName},
            </div>
            
            <div class="message">
              Thank you for choosing Boomiis Restaurant! We hope you enjoyed your meal from ${formattedDate}.
            </div>

            <div class="order-summary">
              <h3>Your Order #${data.orderNumber}</h3>
              <ul>
                ${itemsList}
              </ul>
              <div class="order-info">
                Ordered on ${formattedDate}
              </div>
            </div>

            <div class="stars">
              ⭐⭐⭐⭐⭐
            </div>

            <div class="message">
              Your feedback helps us improve and helps other customers discover authentic West African cuisine. 
              It only takes a minute to share your thoughts!
            </div>

            <div class="button-container">
              <a href="${reviewUrl}" class="cta-button">Leave a Review</a>
            </div>

            <div class="benefits">
              <h4>Why Your Review Matters:</h4>
              <ul>
                <li>Help us maintain our high standards</li>
                <li>Guide other food lovers to great dishes</li>
                <li>Support a local family-owned business</li>
                <li>Shape our menu and service improvements</li>
              </ul>
            </div>

            <div class="social-proof">
              <strong>4.8/5</strong>
              <p>Average rating from 500+ happy customers</p>
              <p>Join our community of food lovers!</p>
            </div>

            <div class="message" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you had any issues with your order, please reply to this email directly. 
              We're here to make things right!
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Boomiis Restaurant</strong></p>
            <p>Authentic West African Cuisine</p>
            <p>
              <a href="${ENV.baseUrl}">Visit Our Website</a> | 
              <a href="${ENV.baseUrl}/menu">View Menu</a> | 
              <a href="${ENV.baseUrl}/contact">Contact Us</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
              You're receiving this email because you recently placed an order with us.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send review request email to customer
 */
export async function sendReviewRequestEmail(data: ReviewRequestData): Promise<{ success: boolean; error?: any }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Validate email address
    if (!isValidEmail(data.customerEmail)) {
      console.error('[ReviewRequest] Invalid email address:', data.customerEmail);
      return { success: false, error: 'Invalid email address' };
    }

    const html = await generateReviewRequestEmailHTML(data);
    const plainText = htmlToPlainText(html);

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `⭐ How was your Boomiis experience? - Order #${data.orderNumber}`,
      html,
      text: plainText,
      replyTo: 'hello@orders.boomiis.com',
      headers: getEmailHeaders({
        entityRefId: data.orderNumber,
        isMarketing: false,
      }),
    });

    if (error) {
      console.error('[ReviewRequest] Failed to send review request:', error);
      return { success: false, error };
    }

    console.log('[ReviewRequest] Review request sent:', result?.id);
    return { success: true };
  } catch (error) {
    console.error('[ReviewRequest] Error sending review request:', error);
    return { success: false, error };
  }
}
