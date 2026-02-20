/**
 * Default SMS templates seeded on server startup
 * These templates are inserted into the database if no SMS templates exist
 */

export interface DefaultSmsTemplate {
  templateType: string;
  templateName: string;
  message: string;
  isActive: boolean;
}

export const DEFAULT_SMS_TEMPLATES: DefaultSmsTemplate[] = [
  // Customer Order Templates
  {
    templateType: 'order_confirmed',
    templateName: 'Order Confirmed',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. We\'ll notify you when it\'s ready!',
    isActive: true,
  },
  {
    templateType: 'order_preparing',
    templateName: 'Order Preparing',
    message: 'Good news {{customerName}}! Your order #{{orderNumber}} is now being prepared by our kitchen team.',
    isActive: true,
  },
  {
    templateType: 'order_ready',
    templateName: 'Order Ready for Pickup',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} is ready for pickup at Boomiis Restaurant. See you soon!',
    isActive: true,
  },
  {
    templateType: 'out_for_delivery',
    templateName: 'Out for Delivery',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} is out for delivery and will arrive in approximately {{estimatedMinutes}} minutes.',
    isActive: true,
  },
  {
    templateType: 'order_delivered',
    templateName: 'Order Delivered',
    message: 'Your order #{{orderNumber}} has been delivered. Enjoy your meal from Boomiis Restaurant! Please rate your experience.',
    isActive: true,
  },
  {
    templateType: 'order_delayed',
    templateName: 'Order Delayed',
    message: 'Hi {{customerName}}, we apologize but your order #{{orderNumber}} is running {{estimatedMinutes}} minutes late. Thank you for your patience!',
    isActive: true,
  },
  {
    templateType: 'order_cancelled',
    templateName: 'Order Cancelled',
    message: 'Your order #{{orderNumber}} has been cancelled. If you have questions, please contact Boomiis Restaurant.',
    isActive: true,
  },

  // Admin Notifications
  {
    templateType: 'admin_new_order',
    templateName: 'Admin: New Order',
    message: 'New {{orderType}} order #{{orderNumber}} received! Total: £{{total}}. Check admin panel for details.',
    isActive: true,
  },
  {
    templateType: 'admin_new_reservation',
    templateName: 'Admin: New Reservation',
    message: 'New reservation: {{customerName}}, {{partySize}} guests on {{date}} at {{time}}. Check admin panel.',
    isActive: true,
  },
  {
    templateType: 'admin_catering_quote',
    templateName: 'Admin: Catering Quote Request',
    message: 'Boomiis Catering Quote Request! {{customerName}} wants {{eventType}} for {{guestCount}} guests on {{eventDate}}. Check admin panel.',
    isActive: true,
  },

  // Reservation Templates
  {
    templateType: 'reservation_confirmed',
    templateName: 'Reservation Confirmed',
    message: 'Hi {{customerName}}! Your table for {{partySize}} on {{date}} at {{time}} is confirmed at Boomiis Restaurant. See you then!',
    isActive: true,
  },
  {
    templateType: 'reservation_reminder',
    templateName: 'Reservation Reminder',
    message: 'Reminder: Your reservation at Boomiis Restaurant is tomorrow at {{time}} for {{partySize}} guests. Looking forward to seeing you!',
    isActive: true,
  },
  {
    templateType: 'reservation_cancelled',
    templateName: 'Reservation Cancelled',
    message: 'Your reservation at Boomiis Restaurant for {{date}} at {{time}} has been cancelled. Hope to see you again soon!',
    isActive: true,
  },

  // Catering/Events Templates
  {
    templateType: 'catering_confirmed',
    templateName: 'Catering Confirmed',
    message: 'Hi {{customerName}}! Your {{eventType}} is confirmed for {{eventDate}} ({{guestCount}} guests). Check your email for full details!',
    isActive: true,
  },
  {
    templateType: 'catering_quote_response',
    templateName: 'Catering Quote Response',
    message: 'Hi {{customerName}}! Regarding your {{eventType}} inquiry at Boomiis: {{responseMessage}}. Check your email for full details.',
    isActive: true,
  },
];
