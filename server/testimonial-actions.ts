import { Request, Response } from 'express';
import { getDb } from './db';
import { testimonials } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function handleTestimonialAction(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).send('Invalid token');
    }

    // Decode the token
    let decoded: { id: number; action: 'approve' | 'reject'; timestamp: number };
    try {
      decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    } catch {
      return res.status(400).send('Invalid token format');
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - decoded.timestamp;
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.status(400).send('Token expired. Please use the admin panel.');
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).send('Database not available');
    }

    // Get the testimonial
    const testimonial = await db.select()
      .from(testimonials)
      .where(eq(testimonials.id, decoded.id))
      .limit(1);

    if (testimonial.length === 0) {
      return res.status(404).send('Testimonial not found');
    }

    // Perform the action
    if (decoded.action === 'approve') {
      await db.update(testimonials)
        .set({ isApproved: true })
        .where(eq(testimonials.id, decoded.id));
      
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Testimonial Approved</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f4f4f4;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              .success-icon {
                font-size: 48px;
                color: #10b981;
                margin-bottom: 20px;
              }
              h1 {
                color: #333;
                margin: 0 0 10px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .testimonial {
                background: #f9fafb;
                padding: 20px;
                border-left: 4px solid #10b981;
                margin: 20px 0;
                text-align: left;
              }
              .customer-name {
                font-weight: bold;
                color: #333;
              }
              .rating {
                color: #d97706;
                font-size: 18px;
              }
              a {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background-color: #d97706;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Testimonial Approved!</h1>
              <p>The testimonial has been successfully approved and is now visible on your website.</p>
              <div class="testimonial">
                <p class="customer-name">${testimonial[0].customerName}</p>
                <p class="rating">${'★'.repeat(testimonial[0].rating)}${'☆'.repeat(5 - testimonial[0].rating)}</p>
                <p>"${testimonial[0].content}"</p>
              </div>
              <a href="/admin/testimonials">View All Testimonials</a>
            </div>
          </body>
        </html>
      `);
    } else if (decoded.action === 'reject') {
      await db.delete(testimonials)
        .where(eq(testimonials.id, decoded.id));
      
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Testimonial Rejected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f4f4f4;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              .reject-icon {
                font-size: 48px;
                color: #ef4444;
                margin-bottom: 20px;
              }
              h1 {
                color: #333;
                margin: 0 0 10px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              a {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background-color: #d97706;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="reject-icon">✗</div>
              <h1>Testimonial Rejected</h1>
              <p>The testimonial has been rejected and removed from the system.</p>
              <a href="/admin/testimonials">View All Testimonials</a>
            </div>
          </body>
        </html>
      `);
    } else {
      return res.status(400).send('Invalid action');
    }
  } catch (error) {
    console.error('[Testimonial Action] Error:', error);
    return res.status(500).send('Internal server error');
  }
}
