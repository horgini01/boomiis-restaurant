import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { emailLogs, smsLogs } from '../../drizzle/schema';
import { and, eq, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * Analytics router for email and SMS tracking dashboards
 */
export const analyticsRouter = router({
  // Email Analytics
  email: router({
    // Get email analytics summary
    analytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        templateType: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Build where conditions
        const conditions = [];
        if (input.startDate) {
          conditions.push(gte(emailLogs.sentAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(emailLogs.sentAt, input.endDate));
        }
        if (input.templateType) {
          conditions.push(eq(emailLogs.templateType, input.templateType));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total counts by status
        const stats = await db
          .select({
            status: emailLogs.status,
            count: sql<number>`count(*)`,
          })
          .from(emailLogs)
          .where(whereClause)
          .groupBy(emailLogs.status);

        const totalSent = stats.reduce((sum, s) => sum + Number(s.count), 0);
        const delivered = stats.find(s => s.status === 'delivered')?.count || 0;
        const opened = stats.find(s => s.status === 'opened')?.count || 0;
        const clicked = stats.find(s => s.status === 'clicked')?.count || 0;
        const bounced = stats.find(s => s.status === 'bounced')?.count || 0;
        const failed = stats.find(s => s.status === 'failed')?.count || 0;

        // Calculate rates
        const deliveryRate = totalSent > 0 ? ((Number(delivered) + Number(opened) + Number(clicked)) / totalSent * 100).toFixed(2) : '0.00';
        const openRate = totalSent > 0 ? ((Number(opened) + Number(clicked)) / totalSent * 100).toFixed(2) : '0.00';
        const clickRate = totalSent > 0 ? (Number(clicked) / totalSent * 100).toFixed(2) : '0.00';
        const bounceRate = totalSent > 0 ? (Number(bounced) / totalSent * 100).toFixed(2) : '0.00';

        // Get stats by template type
        const byTemplate = await db
          .select({
            templateType: emailLogs.templateType,
            total: sql<number>`count(*)`,
            delivered: sql<number>`sum(case when status in ('delivered', 'opened', 'clicked') then 1 else 0 end)`,
            opened: sql<number>`sum(case when status in ('opened', 'clicked') then 1 else 0 end)`,
            bounced: sql<number>`sum(case when status = 'bounced' then 1 else 0 end)`,
          })
          .from(emailLogs)
          .where(whereClause)
          .groupBy(emailLogs.templateType);

        return {
          summary: {
            totalSent,
            delivered: Number(delivered) + Number(opened) + Number(clicked),
            opened: Number(opened) + Number(clicked),
            clicked: Number(clicked),
            bounced: Number(bounced),
            failed: Number(failed),
            deliveryRate: parseFloat(deliveryRate),
            openRate: parseFloat(openRate),
            clickRate: parseFloat(clickRate),
            bounceRate: parseFloat(bounceRate),
          },
          byTemplate: byTemplate.map(t => ({
            templateType: t.templateType,
            total: Number(t.total),
            delivered: Number(t.delivered),
            opened: Number(t.opened),
            bounced: Number(t.bounced),
            deliveryRate: Number(t.total) > 0 ? (Number(t.delivered) / Number(t.total) * 100).toFixed(2) : '0.00',
            openRate: Number(t.total) > 0 ? (Number(t.opened) / Number(t.total) * 100).toFixed(2) : '0.00',
          })),
        };
      }),

    // Get email logs with pagination
    logs: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        templateType: z.string().optional(),
        status: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Build where conditions
        const conditions = [];
        if (input.startDate) {
          conditions.push(gte(emailLogs.sentAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(emailLogs.sentAt, input.endDate));
        }
        if (input.templateType) {
          conditions.push(eq(emailLogs.templateType, input.templateType));
        }
        if (input.status) {
          conditions.push(eq(emailLogs.status, input.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(emailLogs)
          .where(whereClause);

        // Get paginated logs
        const offset = (input.page - 1) * input.pageSize;
        const logs = await db
          .select()
          .from(emailLogs)
          .where(whereClause)
          .orderBy(desc(emailLogs.sentAt))
          .limit(input.pageSize)
          .offset(offset);

        return {
          logs,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            total: Number(count),
            totalPages: Math.ceil(Number(count) / input.pageSize),
          },
        };
      }),
  }),

  // SMS Analytics
  sms: router({
    // Get SMS analytics summary
    analytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        templateType: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Build where conditions
        const conditions = [];
        if (input.startDate) {
          conditions.push(gte(smsLogs.sentAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(smsLogs.sentAt, input.endDate));
        }
        if (input.templateType) {
          conditions.push(eq(smsLogs.templateType, input.templateType));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total counts by status
        const stats = await db
          .select({
            status: smsLogs.status,
            count: sql<number>`count(*)`,
            totalCost: sql<number>`sum(cost_gbp)`,
          })
          .from(smsLogs)
          .where(whereClause)
          .groupBy(smsLogs.status);

        const totalSent = stats.reduce((sum, s) => sum + Number(s.count), 0);
        const sent = stats.find(s => s.status === 'sent')?.count || 0;
        const delivered = stats.find(s => s.status === 'delivered')?.count || 0;
        const failed = stats.find(s => s.status === 'failed')?.count || 0;
        const pending = stats.find(s => s.status === 'pending')?.count || 0;
        const totalCost = stats.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);

        // Calculate rates
        const deliveryRate = totalSent > 0 ? ((Number(sent) + Number(delivered)) / totalSent * 100).toFixed(2) : '0.00';
        const failureRate = totalSent > 0 ? (Number(failed) / totalSent * 100).toFixed(2) : '0.00';
        const avgCostPerSMS = totalSent > 0 ? (totalCost / totalSent).toFixed(4) : '0.0000';

        // Get stats by template type
        const byTemplate = await db
          .select({
            templateType: smsLogs.templateType,
            total: sql<number>`count(*)`,
            sent: sql<number>`sum(case when status in ('sent', 'delivered') then 1 else 0 end)`,
            failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
            totalCost: sql<number>`sum(cost_gbp)`,
            totalSegments: sql<number>`sum(segment_count)`,
          })
          .from(smsLogs)
          .where(whereClause)
          .groupBy(smsLogs.templateType);

        // Get stats by provider
        const byProvider = await db
          .select({
            provider: smsLogs.provider,
            total: sql<number>`count(*)`,
            totalCost: sql<number>`sum(cost_gbp)`,
          })
          .from(smsLogs)
          .where(whereClause)
          .groupBy(smsLogs.provider);

        return {
          summary: {
            totalSent,
            sent: Number(sent) + Number(delivered),
            delivered: Number(delivered),
            failed: Number(failed),
            pending: Number(pending),
            totalCost: parseFloat(totalCost.toFixed(4)),
            avgCostPerSMS: parseFloat(avgCostPerSMS),
            deliveryRate: parseFloat(deliveryRate),
            failureRate: parseFloat(failureRate),
          },
          byTemplate: byTemplate.map(t => ({
            templateType: t.templateType,
            total: Number(t.total),
            sent: Number(t.sent),
            failed: Number(t.failed),
            totalCost: parseFloat(Number(t.totalCost).toFixed(4)),
            totalSegments: Number(t.totalSegments),
            avgCost: Number(t.total) > 0 ? (Number(t.totalCost) / Number(t.total)).toFixed(4) : '0.0000',
            deliveryRate: Number(t.total) > 0 ? (Number(t.sent) / Number(t.total) * 100).toFixed(2) : '0.00',
          })),
          byProvider: byProvider.map(p => ({
            provider: p.provider,
            total: Number(p.total),
            totalCost: parseFloat(Number(p.totalCost).toFixed(4)),
            avgCost: Number(p.total) > 0 ? (Number(p.totalCost) / Number(p.total)).toFixed(4) : '0.0000',
          })),
        };
      }),

    // Get SMS logs with pagination
    logs: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        templateType: z.string().optional(),
        status: z.enum(['sent', 'delivered', 'failed', 'pending']).optional(),
        provider: z.enum(['bulksms', 'textlocal']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Build where conditions
        const conditions = [];
        if (input.startDate) {
          conditions.push(gte(smsLogs.sentAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(smsLogs.sentAt, input.endDate));
        }
        if (input.templateType) {
          conditions.push(eq(smsLogs.templateType, input.templateType));
        }
        if (input.status) {
          conditions.push(eq(smsLogs.status, input.status));
        }
        if (input.provider) {
          conditions.push(eq(smsLogs.provider, input.provider));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(smsLogs)
          .where(whereClause);

        // Get paginated logs
        const offset = (input.page - 1) * input.pageSize;
        const logs = await db
          .select()
          .from(smsLogs)
          .where(whereClause)
          .orderBy(desc(smsLogs.sentAt))
          .limit(input.pageSize)
          .offset(offset);

        return {
          logs,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            total: Number(count),
            totalPages: Math.ceil(Number(count) / input.pageSize),
          },
        };
      }),
  }),
});
