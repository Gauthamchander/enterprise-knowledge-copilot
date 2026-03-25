/**
 * Conversation Repository — handles database operations for conversations.
 *
 * Keep all Prisma access centralized so services/controllers remain focused
 * on business logic.
 */
import prisma from '../prisma/client';
import { Conversation } from '@prisma/client';

export class ConversationRepository {
  /**
   * Create a new conversation for a user (org optional).
   */
  async create(data: {
    userId: string;
    organisationId?: string | null;
  }): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        userId: data.userId,
        organisationId: data.organisationId ?? null,
      },
    });
  }

  /**
   * Find a conversation by id.
   */
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({
      where: { id },
    });
  }

  /**
   * Find a conversation by id that belongs to a user (ownership check).
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Conversation | null> {
    return prisma.conversation.findFirst({
      where: { id, userId },
    });
  }

  /**
   * List user conversations (newest first).
   */
  async findByUserId(userId: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export default new ConversationRepository();

