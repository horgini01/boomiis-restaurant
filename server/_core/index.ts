import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../webhooks/stripe";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize scheduled jobs
  const { setupCronJobs } = await import('../jobs/setup-cron');
  setupCronJobs();
  
  // Stripe webhook MUST come before express.json() for signature verification
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
  
  // Resend webhook for email delivery tracking
  const { handleResendWebhook } = await import('../webhooks/resend');
  app.post('/api/resend/webhook', express.json(), handleResendWebhook);
  
  // Generic image proxy endpoint - serves any Manus storage file with authentication
  app.get('/api/images/*', async (req, res) => {
    const { handleImageProxy } = await import('./imageProxy');
    return handleImageProxy(req, res);
  });
  
  // Logo proxy endpoint - serves S3 files with authentication
  app.get('/api/logo', async (req, res) => {
    try {
      const { storageGet } = await import('../storage');
      const { getDb } = await import('../db');
      const { siteSettings } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).send('Database not available');
      }
      
      const [setting] = await db.select().from(siteSettings)
        .where(eq(siteSettings.settingKey, 'restaurant_logo'))
        .limit(1);
      
      if (!setting || !setting.settingValue) {
        return res.status(404).send('Logo not found');
      }
      
      const key = setting.settingValue; // Now storing just the key
      
      // Use Forge API downloadUrl endpoint to get a signed URL, then fetch and proxy
      const { ENV } = await import('./env');
      const downloadUrlApiEndpoint = new URL('v1/storage/downloadUrl', ENV.forgeApiUrl.endsWith('/') ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`);
      downloadUrlApiEndpoint.searchParams.set('path', key);
      
      console.log('[Logo Proxy] Getting download URL for key:', key);
      const urlResponse = await fetch(downloadUrlApiEndpoint, {
        headers: {
          'Authorization': `Bearer ${ENV.forgeApiKey}`
        }
      });
      
      if (!urlResponse.ok) {
        const errorText = await urlResponse.text();
        console.error('[Logo Proxy] Failed to get download URL:', errorText);
        return res.status(urlResponse.status).send('Failed to get download URL');
      }
      
      const { url: signedUrl } = await urlResponse.json();
      console.log('[Logo Proxy] Got signed URL, fetching file...');
      
      // Now fetch the actual file from the signed URL
      const response = await fetch(signedUrl);
      console.log('[Logo Proxy] File fetch status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Logo Proxy] Failed to fetch file:', errorText);
        return res.status(response.status).send('Failed to fetch logo');
      }
      
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', response.headers.get('content-type') || 'image/png');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Logo proxy error:', error);
      res.status(500).send('Internal server error');
    }
  });
  
  // Testimonial quick action endpoint
  app.get('/api/testimonial-action', async (req, res) => {
    const { handleTestimonialAction } = await import('../testimonial-actions');
    return handleTestimonialAction(req, res);
  });
  
  // Health check endpoints for Railway/Docker monitoring
  const healthRouter = await import('./health');
  app.use('/api', healthRouter.default);
  
  // Configure cookie parser for authentication
  app.use(cookieParser());
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  
  // Weekly report endpoint
  const weeklyReportRouter = await import('../weekly-report');
  app.use(weeklyReportRouter.default);
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
