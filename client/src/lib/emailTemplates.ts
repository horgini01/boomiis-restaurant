/**
 * Email Template Library
 * Pre-designed email templates for quick campaign creation
 */

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'promotion' | 'event' | 'seasonal';
  description: string;
  thumbnail: string;
  bodyHtml: string;
  defaultSubject: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome-newsletter',
    name: 'Welcome to Newsletter',
    category: 'welcome',
    description: 'Warm welcome email for new subscribers with what to expect',
    thumbnail: '🎉',
    defaultSubject: 'Welcome to Our Newsletter! 🎉',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 32px; margin: 0;">Welcome to Our Newsletter! 🎉</h1>
      </div>
      
      <div style="background: #fff; border-left: 4px solid #d4a574; padding: 20px; margin: 20px 0;">
        <h2 style="color: #d4a574; margin-top: 0;">Thank you for subscribing, Valued Customer!</h2>
        <p style="font-size: 16px; line-height: 1.8;">
          We're thrilled to have you join our community of food lovers. You'll now be the first to 
          know about our latest dishes, special offers, and exclusive events.
        </p>
      </div>
      
      <h3 style="color: #333; margin-top: 30px;">What to expect:</h3>
      <ul style="font-size: 16px; line-height: 2;">
        <li>🍽️ New menu items and seasonal specials</li>
        <li>🎊 Exclusive promotions and discounts</li>
        <li>📅 Upcoming events and catering opportunities</li>
        <li>☀️ Behind-the-scenes stories and recipes</li>
        <li>🎂 Special birthday treats and surprises</li>
      </ul>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[MENU_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Explore Our Menu</a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 16px; margin-top: 30px;">
        Stay tuned for delicious updates! 🍴
      </p>
    `
  },
  {
    id: 'monthly-special',
    name: 'Monthly Special Offer',
    category: 'promotion',
    description: 'Promote monthly specials and limited-time dishes',
    thumbnail: '🍲',
    defaultSubject: 'This Month\'s Special: [DISH_NAME] 🍲',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 36px; margin: 0;">This Month's Special</h1>
        <p style="font-size: 18px; color: #666;">Limited Time Only!</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #d4a574 0%, #c89860 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
        <h2 style="font-size: 28px; margin: 0 0 15px 0;">[DISH_NAME]</h2>
        <p style="font-size: 20px; margin: 0;">[DISH_DESCRIPTION]</p>
        <div style="margin-top: 20px; font-size: 32px; font-weight: bold;">
          <span style="text-decoration: line-through; opacity: 0.7; font-size: 24px;">£[ORIGINAL_PRICE]</span>
          <span style="margin-left: 15px;">£[SPECIAL_PRICE]</span>
        </div>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #d4a574; margin-top: 0;">Why You'll Love It:</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>[FEATURE_1]</li>
          <li>[FEATURE_2]</li>
          <li>[FEATURE_3]</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[ORDER_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 50px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Order Now</a>
      </div>
      
      <p style="text-align: center; color: #999; font-size: 14px; margin-top: 30px;">
        *Offer valid until [END_DATE]. Terms and conditions apply.
      </p>
    `
  },
  {
    id: 'event-announcement',
    name: 'Event Announcement',
    category: 'event',
    description: 'Announce special events, live music, or catering opportunities',
    thumbnail: '🎊',
    defaultSubject: 'Join Us: [EVENT_NAME] 🎊',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 36px; margin: 0;">You're Invited!</h1>
      </div>
      
      <div style="background: #d4a574; color: white; padding: 40px 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
        <h2 style="font-size: 32px; margin: 0 0 20px 0;">[EVENT_NAME]</h2>
        <div style="font-size: 18px; line-height: 1.8;">
          <p style="margin: 10px 0;">📅 <strong>[EVENT_DATE]</strong></p>
          <p style="margin: 10px 0;">🕐 <strong>[EVENT_TIME]</strong></p>
          <p style="margin: 10px 0;">📍 <strong>[EVENT_LOCATION]</strong></p>
        </div>
      </div>
      
      <div style="padding: 20px 0;">
        <p style="font-size: 16px; line-height: 1.8;">
          [EVENT_DESCRIPTION]
        </p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #d4a574; margin-top: 0;">Event Highlights:</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>[HIGHLIGHT_1]</li>
          <li>[HIGHLIGHT_2]</li>
          <li>[HIGHLIGHT_3]</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[RSVP_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 50px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Reserve Your Spot</a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 16px; margin-top: 30px;">
        Limited seating available. Book early to avoid disappointment!
      </p>
    `
  },
  {
    id: 'seasonal-offer',
    name: 'Seasonal Promotion',
    category: 'seasonal',
    description: 'Holiday specials, seasonal menus, and festive offers',
    thumbnail: '🎄',
    defaultSubject: '[SEASON] Special Menu Available Now! 🎄',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 36px; margin: 0;">[SEASON] Celebration</h1>
        <p style="font-size: 18px; color: #666;">Authentic Flavors for the Season</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #d4a574 0%, #c89860 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
        <h2 style="font-size: 28px; margin: 0 0 15px 0;">Special [SEASON] Menu</h2>
        <p style="font-size: 18px; line-height: 1.6;">
          [SEASONAL_DESCRIPTION]
        </p>
      </div>
      
      <div style="padding: 20px 0;">
        <h3 style="color: #d4a574; text-align: center;">Featured Dishes:</h3>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #333; margin-top: 0;">[DISH_1_NAME]</h4>
          <p style="color: #666; margin: 5px 0;">[DISH_1_DESCRIPTION]</p>
          <p style="color: #d4a574; font-weight: bold; margin: 10px 0;">£[DISH_1_PRICE]</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #333; margin-top: 0;">[DISH_2_NAME]</h4>
          <p style="color: #666; margin: 5px 0;">[DISH_2_DESCRIPTION]</p>
          <p style="color: #d4a574; font-weight: bold; margin: 10px 0;">£[DISH_2_PRICE]</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #333; margin-top: 0;">[DISH_3_NAME]</h4>
          <p style="color: #666; margin: 5px 0;">[DISH_3_DESCRIPTION]</p>
          <p style="color: #d4a574; font-weight: bold; margin: 10px 0;">£[DISH_3_PRICE]</p>
        </div>
      </div>
      
      <div style="background: #d4a574; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
        <p style="font-size: 18px; margin: 0;">
          🎁 <strong>Special Offer:</strong> [OFFER_DETAILS]
        </p>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[MENU_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 50px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">View Full Menu</a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 16px; margin-top: 30px;">
        Available for a limited time. Pre-order now for [SEASON] celebrations!
      </p>
    `
  },
  {
    id: 'discount-promo',
    name: 'Discount & Promotion',
    category: 'promotion',
    description: 'Percentage off, buy-one-get-one, and other promotional offers',
    thumbnail: '💰',
    defaultSubject: 'Exclusive Offer: [DISCOUNT]% Off! 💰',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 42px; margin: 0;">Special Offer Just for You!</h1>
      </div>
      
      <div style="background: #d4a574; color: white; padding: 50px 20px; text-align: center; border-radius: 10px; margin: 30px 0; border: 5px dashed #fff;">
        <div style="font-size: 72px; font-weight: bold; margin: 0;">[DISCOUNT]%</div>
        <div style="font-size: 24px; margin: 15px 0;">OFF</div>
        <p style="font-size: 18px; margin: 20px 0 0 0;">[OFFER_DESCRIPTION]</p>
      </div>
      
      <div style="padding: 20px 0;">
        <h3 style="color: #d4a574; text-align: center;">How to Redeem:</h3>
        <ol style="font-size: 16px; line-height: 1.8;">
          <li>[STEP_1]</li>
          <li>[STEP_2]</li>
          <li>[STEP_3]</li>
        </ol>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Use promo code:</p>
        <div style="background: white; border: 2px dashed #d4a574; padding: 15px; font-size: 24px; font-weight: bold; color: #d4a574; letter-spacing: 2px;">
          [PROMO_CODE]
        </div>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[ORDER_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 50px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Order Now & Save</a>
      </div>
      
      <p style="text-align: center; color: #999; font-size: 14px; margin-top: 30px;">
        *Offer expires [EXPIRY_DATE]. Cannot be combined with other offers. Minimum order value may apply.
      </p>
    `
  },
  {
    id: 'catering-service',
    name: 'Catering Services',
    category: 'event',
    description: 'Promote catering services for parties, weddings, and corporate events',
    thumbnail: '🍱',
    defaultSubject: 'Make Your Event Unforgettable with Our Catering 🍱',
    bodyHtml: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4a574; font-size: 36px; margin: 0;">Premium Catering Services</h1>
        <p style="font-size: 18px; color: #666;">Authentic West African Cuisine for Your Special Event</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p style="font-size: 16px; line-height: 1.8; text-align: center;">
          [CATERING_INTRO]
        </p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #d4a574; margin-top: 0; text-align: center;">Perfect For:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
          <div style="text-align: center; padding: 15px;">
            <div style="font-size: 32px; margin-bottom: 10px;">💼</div>
            <strong>Corporate Events</strong>
          </div>
          <div style="text-align: center; padding: 15px;">
            <div style="font-size: 32px; margin-bottom: 10px;">💒</div>
            <strong>Weddings</strong>
          </div>
          <div style="text-align: center; padding: 15px;">
            <div style="font-size: 32px; margin-bottom: 10px;">🎉</div>
            <strong>Private Parties</strong>
          </div>
          <div style="text-align: center; padding: 15px;">
            <div style="font-size: 32px; margin-bottom: 10px;">🎂</div>
            <strong>Celebrations</strong>
          </div>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #d4a574 0%, #c89860 100%); color: white; padding: 30px 20px; border-radius: 10px; margin: 30px 0;">
        <h3 style="margin-top: 0; text-align: center;">What's Included:</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>[INCLUDED_1]</li>
          <li>[INCLUDED_2]</li>
          <li>[INCLUDED_3]</li>
          <li>[INCLUDED_4]</li>
        </ul>
      </div>
      
      <div style="text-align: center; padding: 30px 0;">
        <p style="font-size: 18px; color: #d4a574; font-weight: bold; margin: 0 0 10px 0;">Starting from</p>
        <p style="font-size: 36px; color: #333; font-weight: bold; margin: 0;">£[STARTING_PRICE] <span style="font-size: 18px; color: #666;">per person</span></p>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="[CONTACT_URL]" style="display: inline-block; background: #d4a574; color: white; padding: 15px 50px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Get a Quote</a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 16px; margin-top: 30px;">
        Contact us at least [NOTICE_PERIOD] in advance to ensure availability.
      </p>
    `
  }
];

export const getTemplatesByCategory = (category: EmailTemplate['category']) => {
  return emailTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return emailTemplates.find(template => template.id === id);
};
