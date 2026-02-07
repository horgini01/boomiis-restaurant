// Comprehensive list of all email and SMS template types used in the system

export const EMAIL_TEMPLATE_TYPES = [
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'order_preparing', label: 'Order Preparing' },
  { value: 'order_ready', label: 'Order Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'order_delivered', label: 'Order Delivered' },
  { value: 'order_delayed', label: 'Order Delayed' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'order_completed', label: 'Order Completed' },
  { value: 'admin_order_notification', label: 'Admin Order Notification' },
  { value: 'reservation_confirmed', label: 'Reservation Confirmed' },
  { value: 'reservation_cancelled', label: 'Reservation Cancelled' },
  { value: 'reservation_completed', label: 'Reservation Completed' },
  { value: 'reservation_reminder', label: 'Reservation Reminder' },
  { value: 'admin_reservation_notification', label: 'Admin Reservation Notification' },
  { value: 'event_inquiry_confirmation', label: 'Event Inquiry Confirmation' },
  { value: 'event_inquiry_status', label: 'Event Inquiry Status Update' },
  { value: 'event_confirmation', label: 'Event Confirmation' },
  { value: 'event_inquiry_response', label: 'Event Inquiry Response' },
  { value: 'catering_quote_request', label: 'Catering Quote Request' },
  { value: 'daily_sales_summary', label: 'Daily Sales Summary' },
  { value: 'newsletter_confirmation', label: 'Newsletter Subscription Confirmation' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'testimonial_notification', label: 'Testimonial Notification' },
  { value: 'testimonial_response', label: 'Testimonial Response' },
  { value: 'review_request', label: 'Review Request' },
] as const;

export const SMS_TEMPLATE_TYPES = [
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'order_preparing', label: 'Order Preparing' },
  { value: 'order_ready', label: 'Order Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'order_delivered', label: 'Order Delivered' },
  { value: 'order_delayed', label: 'Order Delayed' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'order_completed', label: 'Order Completed' },
  { value: 'reservation_confirmed', label: 'Reservation Confirmed' },
  { value: 'reservation_cancelled', label: 'Reservation Cancelled' },
  { value: 'reservation_completed', label: 'Reservation Completed' },
  { value: 'reservation_reminder', label: 'Reservation Reminder' },
  { value: 'admin_new_order', label: 'Admin New Order Notification' },
  { value: 'admin_weekly_report', label: 'Admin Weekly Report' },
  { value: 'newsletter_confirmation', label: 'Newsletter Subscription Confirmation' },
  { value: 'event_confirmation', label: 'Event Confirmation' },
  { value: 'event_inquiry_response', label: 'Event Inquiry Response' },
  { value: 'catering_quote_request', label: 'Catering Quote Request' },
] as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number]['value'];
export type SMSTemplateType = typeof SMS_TEMPLATE_TYPES[number]['value'];
