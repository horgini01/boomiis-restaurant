import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Opening Hours", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, name: "Test User", email: "test@example.com", role: "admin" },
    req: {} as any,
    res: {} as any,
  });

  it("should list opening hours", async () => {
    const result = await caller.openingHours.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should update opening hours for all 7 days", async () => {
    const testHours = [
      { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00", isClosed: false },
      { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 4, openTime: "09:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 6, openTime: "10:00", closeTime: "20:00", isClosed: false },
    ];

    const result = await caller.openingHours.updateBulk(testHours);
    expect(result.success).toBe(true);
  });
});
