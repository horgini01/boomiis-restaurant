/**
 * Health Check Endpoint
 * Used by Railway and Docker for monitoring application health
 */

import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

/**
 * Basic health check endpoint
 * Returns 200 OK if application is running
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check endpoint
 * Checks database connectivity and other services
 */
router.get("/health/detailed", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: "unknown",
      memory: "unknown",
    },
  };

  // Check database connectivity
  try {
    const db = await getDb();
    if (db) {
      // Simple query to test database connectivity
      await db.execute({ sql: "SELECT 1", params: [] } as any);
      health.checks.database = "ok";
    } else {
      health.checks.database = "unavailable";
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = "error";
    health.status = "degraded";
    console.error("[Health Check] Database error:", error);
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  health.checks.memory = memoryUsageMB.heapUsed < 500 ? "ok" : "warning";

  // Set HTTP status based on overall health
  const statusCode = health.status === "ok" ? 200 : 503;

  res.status(statusCode).json(health);
});

export default router;
