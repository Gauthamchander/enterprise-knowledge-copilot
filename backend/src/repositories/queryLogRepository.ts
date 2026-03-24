/**
 * QueryLog Repository — handles database operations for chat query logs.
 *
 * This keeps Prisma access in one place so services/controllers remain focused
 * on business logic.
 */
import prisma from '../prisma/client';
import { QueryLog } from '@prisma/client';

export class QueryLogRepository {
  /**
   * Create a query log entry.
   */
  async create(data: {
    userId: string;
    orgId?: string | null;
    departmentId?: string | null;
    question: string;
    response: string;
    responseTimeMs: number;
    documentIdsUsed: string[];
  }): Promise<QueryLog> {
    return prisma.queryLog.create({
      data: {
        userId: data.userId,
        orgId: data.orgId ?? null,
        departmentId: data.departmentId ?? null,
        question: data.question,
        response: data.response,
        responseTimeMs: data.responseTimeMs,
        documentIdsUsed: data.documentIdsUsed,
      },
    });
  }
}

export default new QueryLogRepository();
