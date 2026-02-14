import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from 'jsonwebtoken';
import { ENV } from './env';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Try JWT authentication first (for self-hosted)
  try {
    const token = opts.req.cookies?.auth_token;
    if (token) {
      const decoded = jwt.verify(token, ENV.cookieSecret) as { userId: number; email: string; role: string };
      
      // Fetch user from database
      const db = await getDb();
      if (db) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);
        
        if (dbUser && dbUser.status === 'active') {
          user = dbUser;
        }
      }
    }
  } catch (error) {
    // JWT auth failed, try OAuth
  }

  // Fallback to OAuth authentication (for Manus hosting)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
      
      // Check if authenticated user's account is still active
      if (user && user.status !== 'active') {
        console.log(`[Auth] Rejecting session for inactive user: ${user.email} (status: ${user.status})`);
        user = null; // Treat inactive users as unauthenticated
      }
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
