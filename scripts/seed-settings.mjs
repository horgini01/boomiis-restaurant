import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { siteSettings } from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const defaultSettings = [
  {
    settingKey: "restaurant_name",
    settingValue: "Boomiis",
    settingType: "text",
    description: "Restaurant name displayed across the site",
  },
  {
    settingKey: "restaurant_tagline",
    settingValue: "Authentic African cuisine bringing the flavors of West Africa to the UK. Experience the rich tastes and warm hospitality.",
    settingType: "textarea",
    description: "Restaurant tagline/description",
  },
  {
    settingKey: "contact_address",
    settingValue: "123 High Street, London, UK, SW1A 1AA",
    settingType: "textarea",
    description: "Physical address",
  },
  {
    settingKey: "contact_phone",
    settingValue: "+44 20 1234 5678",
    settingType: "text",
    description: "Contact phone number",
  },
  {
    settingKey: "contact_email",
    settingValue: "hello@boomiis.uk",
    settingType: "text",
    description: "Contact email address",
  },
  {
    settingKey: "opening_hours",
    settingValue: JSON.stringify({
      monday: { open: "12:00", close: "22:00", closed: false },
      tuesday: { open: "12:00", close: "22:00", closed: false },
      wednesday: { open: "12:00", close: "22:00", closed: false },
      thursday: { open: "12:00", close: "22:00", closed: false },
      friday: { open: "12:00", close: "23:00", closed: false },
      saturday: { open: "12:00", close: "23:00", closed: false },
      sunday: { open: "12:00", close: "21:00", closed: false },
    }),
    settingType: "json",
    description: "Restaurant opening hours for each day",
  },
  {
    settingKey: "social_facebook",
    settingValue: "https://facebook.com/boomiis",
    settingType: "text",
    description: "Facebook page URL",
  },
  {
    settingKey: "social_instagram",
    settingValue: "https://instagram.com/boomiis",
    settingType: "text",
    description: "Instagram profile URL",
  },
  {
    settingKey: "social_twitter",
    settingValue: "https://twitter.com/boomiis",
    settingType: "text",
    description: "Twitter/X profile URL",
  },
];

console.log("Seeding restaurant settings...");

for (const setting of defaultSettings) {
  try {
    await db
      .insert(siteSettings)
      .values(setting)
      .onDuplicateKeyUpdate({ set: { settingValue: setting.settingValue } });
    console.log(`✓ ${setting.settingKey}`);
  } catch (error) {
    console.error(`✗ ${setting.settingKey}:`, error.message);
  }
}

console.log("Settings seeded successfully!");
await connection.end();
