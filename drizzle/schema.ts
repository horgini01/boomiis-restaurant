import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "owner", "manager", "kitchen_staff", "front_desk"]).default("user").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  invitedBy: int("invited_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Menu categories (e.g., Starters, Mains, Desserts, Drinks)
 */
export const menuCategories = mysqlTable("menu_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

/**
 * Individual menu items
 */
export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("category_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isVegan: boolean("is_vegan").default(false).notNull(),
  isGlutenFree: boolean("is_gluten_free").default(false).notNull(),
  isHalal: boolean("is_halal").default(false).notNull(),
  allergens: text("allergens"), // JSON array of allergen strings
  isAvailable: boolean("is_available").default(true).notNull(),
  outOfStock: boolean("out_of_stock").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isChefSpecial: boolean("is_chef_special").default(false).notNull(),
  prepTimeMinutes: int("prep_time_minutes").default(15).notNull(), // Estimated preparation time in minutes
  displayOrder: int("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

/**
 * Customer orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  orderType: mysqlEnum("order_type", ["delivery", "pickup"]).notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryPostcode: varchar("delivery_postcode", { length: 20 }),
  scheduledFor: timestamp("scheduled_for"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "delayed"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("payment_status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }).unique(),
  specialInstructions: text("special_instructions"),
  smsOptIn: boolean("sms_opt_in").default(true).notNull(), // Customer consent to receive SMS notifications (GDPR)
  timeline: text("timeline"), // JSON array of {status, timestamp} objects tracking status changes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order line items
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  menuItemId: int("menu_item_id").notNull(),
  menuItemName: varchar("menu_item_name", { length: 200 }).notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Table reservations
 */
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  partySize: int("party_size").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  reservationTime: varchar("reservation_time", { length: 10 }).notNull(),
  specialRequests: text("special_requests"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

/**
 * Event and catering inquiries
 */
export const eventInquiries = mysqlTable("event_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  venueAddress: text("venue_address").notNull(), // Customer's event location
  eventDate: timestamp("event_date"),
  guestCount: int("guest_count"),
  budget: varchar("budget", { length: 100 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "quoted", "booked", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EventInquiry = typeof eventInquiries.$inferSelect;
export type InsertEventInquiry = typeof eventInquiries.$inferInsert;

/**
 * Blog posts
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  authorId: int("author_id").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Gallery images
 */
export const galleryImages = mysqlTable("gallery_images", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 100 }),
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GalleryImage = typeof galleryImages.$inferSelect;
export type InsertGalleryImage = typeof galleryImages.$inferInsert;

/**
 * Newsletter subscribers
 */
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  source: mysqlEnum("source", ["homepage", "checkout", "admin"]).default("homepage").notNull(), // Where they subscribed from
  isActive: boolean("is_active").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = typeof subscribers.$inferInsert;

/**
 * Site settings (restaurant info, hours, delivery settings, etc.)
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  settingType: varchar("setting_type", { length: 50 }).default("text").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

/**
 * Email templates for customizable email communications
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateType: varchar("template_type", { length: 50 }).notNull().unique(), // 'order_confirmation', 'reservation_confirmation', 'admin_order_notification'
  subject: varchar("subject", { length: 200 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  headerColor: varchar("header_color", { length: 7 }).default("#d4a574").notNull(),
  footerText: text("footer_text"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Email delivery logs for tracking and analytics
 */
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }),
  subject: varchar("subject", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["sent", "delivered", "opened", "clicked", "bounced", "failed"]).default("sent").notNull(),
  resendId: varchar("resend_id", { length: 100 }), // Resend email ID for tracking
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON string for additional data (order_id, reservation_id, etc.)
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Delivery coverage areas with postcode prefixes
 */
export const deliveryAreas = mysqlTable("delivery_areas", {
  id: int("id").autoincrement().primaryKey(),
  areaName: varchar("area_name", { length: 100 }).notNull(),
  postcodesPrefixes: text("postcodes_prefixes").notNull(), // Comma-separated postcode prefixes (e.g., "SW1, SW7, SW10")
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(), // Zone-specific delivery fee
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // Center latitude for map visualization
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // Center longitude for map visualization
  radiusMeters: int("radius_meters").default(3000), // Radius in meters for map circle overlay
  displayOrder: int("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DeliveryArea = typeof deliveryAreas.$inferSelect;
export type InsertDeliveryArea = typeof deliveryAreas.$inferInsert;

/**
 * Email marketing campaigns for promotional emails
 */
export const emailCampaigns = mysqlTable("email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  campaignName: varchar("campaign_name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "failed"]).default("draft").notNull(),
  recipientCount: int("recipient_count").default(0).notNull(), // Number of subscribers who received this campaign
  sentCount: int("sent_count").default(0).notNull(), // Number of emails successfully sent
  failedCount: int("failed_count").default(0).notNull(), // Number of emails that failed
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdBy: int("created_by").notNull(), // Admin user ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

/**
 * SMS notification templates for customizable SMS communications
 */
export const smsTemplates = mysqlTable("sms_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateType: varchar("template_type", { length: 50 }).notNull().unique(), // 'order_confirmed', 'order_preparing', 'order_ready', 'out_for_delivery', 'order_delivered', 'order_delayed', 'order_cancelled'
  templateName: varchar("template_name", { length: 100 }).notNull(),
  message: text("message").notNull(), // SMS message body with template variables {{customerName}}, {{orderNumber}}, {{estimatedMinutes}}
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = typeof smsTemplates.$inferInsert;

/**
 * Opening hours for each day of the week
 */
export const openingHours = mysqlTable("opening_hours", {
  id: int("id").autoincrement().primaryKey(),
  dayOfWeek: int("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: varchar("open_time", { length: 5 }).notNull(), // Format: "HH:MM" (24-hour)
  closeTime: varchar("close_time", { length: 5 }).notNull(), // Format: "HH:MM" (24-hour)
  isClosed: boolean("is_closed").default(false).notNull(), // True if restaurant is closed on this day
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type OpeningHour = typeof openingHours.$inferSelect;
export type InsertOpeningHour = typeof openingHours.$inferInsert;

/**
 * Customer reviews for menu items
 */
export const menuItemReviews = mysqlTable("menu_item_reviews", {
  id: int("id").autoincrement().primaryKey(),
  menuItemId: int("menu_item_id").notNull(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }),
  rating: int("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MenuItemReview = typeof menuItemReviews.$inferSelect;
export type InsertMenuItemReview = typeof menuItemReviews.$inferInsert;

/**
 * General restaurant testimonials (not tied to specific menu items)
 */
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }),
  content: text("content").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  isApproved: boolean("is_approved").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(), // Show on homepage
  displayOrder: int("display_order").default(0).notNull(),
  adminResponse: text("admin_response"), // Admin's public reply to testimonial
  adminResponseDate: timestamp("admin_response_date"), // When admin responded
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

/**
 * Testimonial response templates for quick replies
 */
export const testimonialResponseTemplates = mysqlTable("testimonial_response_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Template name (e.g., "Thank You", "Apology")
  content: text("content").notNull(), // Template response text
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type TestimonialResponseTemplate = typeof testimonialResponseTemplates.$inferSelect;
export type InsertTestimonialResponseTemplate = typeof testimonialResponseTemplates.$inferInsert;

/**
 * About page content sections (hero, story, etc.)
 */
export const aboutContent = mysqlTable("about_content", {
  id: int("id").autoincrement().primaryKey(),
  sectionKey: varchar("section_key", { length: 50 }).notNull().unique(), // 'hero_title', 'hero_tagline', 'story_title', 'story_content', 'founder_story'
  sectionValue: text("section_value").notNull(),
  displayOrder: int("display_order").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AboutContent = typeof aboutContent.$inferSelect;
export type InsertAboutContent = typeof aboutContent.$inferInsert;

/**
 * About page values section (4 core values with icons)
 */
export const aboutValues = mysqlTable("about_values", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(), // Lucide icon name (e.g., 'Heart', 'Leaf', 'Users', 'Award')
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AboutValue = typeof aboutValues.$inferSelect;
export type InsertAboutValue = typeof aboutValues.$inferInsert;

/**
 * Team members for About page
 */
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(), // e.g., "Head Chef", "Restaurant Manager"
  bio: text("bio").notNull(),
  imageUrl: text("image_url"),
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Awards and recognition for About page
 */
export const awards = mysqlTable("awards", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  year: int("year"),
  displayOrder: int("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Award = typeof awards.$inferSelect;
export type InsertAward = typeof awards.$inferInsert;

/**
 * Legal pages (Privacy Policy, Terms & Conditions, Accessibility)
 */
export const legalPages = mysqlTable("legal_pages", {
  id: int("id").autoincrement().primaryKey(),
  pageType: varchar("page_type", { length: 50 }).notNull().unique(), // 'privacy_policy', 'terms_conditions', 'accessibility'
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(), // HTML content
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LegalPage = typeof legalPages.$inferSelect;
export type InsertLegalPage = typeof legalPages.$inferInsert;

/**
 * Custom roles created by owners for granular access control
 */
export const customRoles = mysqlTable("custom_roles", {
  id: int("id").autoincrement().primaryKey(),
  roleName: varchar("role_name", { length: 100 }).notNull().unique(),
  roleSlug: varchar("role_slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: int("created_by").notNull(), // User ID of creator (must be owner)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CustomRole = typeof customRoles.$inferSelect;
export type InsertCustomRole = typeof customRoles.$inferInsert;

/**
 * Permissions assigned to custom roles (junction table)
 */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("role_id").notNull(), // References custom_roles.id
  route: varchar("route", { length: 200 }).notNull(), // e.g., '/admin/dashboard', '/admin/orders'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
