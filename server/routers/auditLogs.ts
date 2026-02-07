import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { eq, and, like, desc, gte, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const auditLogsRouter = router({
  // Get audit logs with filtering and pagination
  getAuditLogs: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      userId: z.number().optional(),
      action: z.string().optional(),
      entityType: z.string().optional(),
      search: z.string().optional(), // Search in entityName, userName
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(), // ISO date string
    }).optional())
    .query(async ({ ctx, input }) => {
      // Only owner, admin, and manager can view audit logs
      if (!['admin', 'owner', 'manager'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 50;
      const offset = (page - 1) * pageSize;

      // Build filter conditions
      const conditions = [];

      if (input?.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      if (input?.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }

      if (input?.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }

      if (input?.search) {
        // Full-text search across multiple fields
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(auditLogs.entityName, searchTerm),
            like(auditLogs.userName, searchTerm),
            like(auditLogs.ipAddress, searchTerm),
            like(auditLogs.userAgent, searchTerm),
            like(auditLogs.changes, searchTerm),
            like(auditLogs.entityId, searchTerm)
          )!
        );
      }

      if (input?.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }

      if (input?.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated logs
      const logs = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Parse changes JSON for each log
      const logsWithParsedChanges = logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
      }));

      return {
        logs: logsWithParsedChanges,
        pagination: {
          page,
          pageSize,
          total: logs.length,
          hasMore: logs.length === pageSize,
        },
      };
    }),

  // Get unique values for filters
  getFilterOptions: protectedProcedure
    .query(async ({ ctx }) => {
      // Only owner, admin, and manager can view audit logs
      if (!['admin', 'owner', 'manager'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get distinct actions
      const actions = await db
        .selectDistinct({ action: auditLogs.action })
        .from(auditLogs)
        .orderBy(auditLogs.action);

      // Get distinct entity types
      const entityTypes = await db
        .selectDistinct({ entityType: auditLogs.entityType })
        .from(auditLogs)
        .orderBy(auditLogs.entityType);

      return {
        actions: actions.map(a => a.action).filter(Boolean),
        entityTypes: entityTypes.map(e => e.entityType).filter(Boolean),
      };
    }),

  // Get audit log statistics
  getAuditStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Only owner, admin, and manager can view audit logs
      if (!['admin', 'owner', 'manager'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get total logs count
      const [totalResult] = await db
        .select({ count: auditLogs.id })
        .from(auditLogs);

      // Get logs from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentResult] = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, oneDayAgo));

      // Get most active users
      const topUsers = await db
        .select({
          userId: auditLogs.userId,
          userName: auditLogs.userName,
          count: auditLogs.id,
        })
        .from(auditLogs)
        .groupBy(auditLogs.userId, auditLogs.userName)
        .orderBy(desc(auditLogs.id))
        .limit(5);

      return {
        totalLogs: totalResult?.count || 0,
        recentLogs: recentResult?.count || 0,
        topUsers,
      };
    }),

  // Export audit logs as CSV
  exportCSV: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      action: z.string().optional(),
      entityType: z.string().optional(),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      // Only owner, admin, and manager can export audit logs
      if (!['admin', 'owner', 'manager'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Build filter conditions (same as getAuditLogs)
      const conditions = [];
      if (input?.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input?.action) conditions.push(eq(auditLogs.action, input.action));
      if (input?.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input?.search) {
        // Full-text search across multiple fields
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(auditLogs.entityName, searchTerm),
            like(auditLogs.userName, searchTerm),
            like(auditLogs.ipAddress, searchTerm),
            like(auditLogs.userAgent, searchTerm),
            like(auditLogs.changes, searchTerm),
            like(auditLogs.entityId, searchTerm)
          )!
        );
      }
      if (input?.startDate) conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      if (input?.endDate) conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));

      // Get all matching logs (no pagination for export)
      const logs = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(10000); // Safety limit

      // Generate CSV content
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity Name', 'IP Address', 'Changes'];
      const rows = logs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.userName || 'Unknown',
        log.userRole,
        log.action,
        log.entityType,
        log.entityName || `ID: ${log.entityId}`,
        log.ipAddress || 'N/A',
        log.changes || '{}',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return {
        content: csvContent,
        filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      };
    }),
});
