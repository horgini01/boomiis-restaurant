import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";


import { systemSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const systemSettingsRouter = router({
  // Public procedure to get reservation and events status
  getPublicSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const settings = await db.select().from(systemSettings).where(
      eq(systemSettings.settingKey, "reservations_enabled")
    ).union(
      db.select().from(systemSettings).where(
        eq(systemSettings.settingKey, "reservations_closure_message")
      )
    ).union(
      db.select().from(systemSettings).where(
        eq(systemSettings.settingKey, "events_enabled")
      )
    ).union(
      db.select().from(systemSettings).where(
        eq(systemSettings.settingKey, "events_closure_message")
      )
    );

    const settingsMap: Record<string, string | null> = {};
    settings.forEach((setting: any) => {
      settingsMap[setting.settingKey] = setting.settingValue;
    });

    return {
      reservationsEnabled: settingsMap.reservations_enabled === "true",
      reservationsClosureMessage: settingsMap.reservations_closure_message || "",
      eventsEnabled: settingsMap.events_enabled === "true",
      eventsClosureMessage: settingsMap.events_closure_message || "",
    };
  }),

  // Admin procedure to update reservation settings
  updateReservationSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        closureMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: { enabled: boolean; closureMessage?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Update enabled status
      await db
        .update(systemSettings)
        .set({ settingValue: input.enabled.toString() })
        .where(eq(systemSettings.settingKey, "reservations_enabled"));

      // Update closure message if provided
      if (input.closureMessage !== undefined) {
        await db
          .update(systemSettings)
          .set({ settingValue: input.closureMessage })
          .where(eq(systemSettings.settingKey, "reservations_closure_message"));
      }

      return { success: true };
    }),

  // Admin procedure to update events settings
  updateEventsSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        closureMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: { enabled: boolean; closureMessage?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Update enabled status
      await db
        .update(systemSettings)
        .set({ settingValue: input.enabled.toString() })
        .where(eq(systemSettings.settingKey, "events_enabled"));

      // Update closure message if provided
      if (input.closureMessage !== undefined) {
        await db
          .update(systemSettings)
          .set({ settingValue: input.closureMessage })
          .where(eq(systemSettings.settingKey, "events_closure_message"));
      }

      return { success: true };
    }),
});
