/**
 * ConversationMemory Repository — handles database operations for message-level memory.
 *
 * This keeps Prisma access centralized and makes service logic cleaner.
 */
import prisma from '../prisma/client';
import { ConversationMemory } from '@prisma/client';

export class ConversationMemoryRepository {
  /**
   * Create a memory message in a conversation.
   */
  async create(data: {
    conversationId: string;
    userId: string;
    role: string;
    content: string;
  }): Promise<ConversationMemory> {
    return prisma.conversationMemory.create({
      data: {
        conversationId: data.conversationId,
        userId: data.userId,
        role: data.role,
        content: data.content,
      },
    });
  }

  /**
   * Get recent messages for a conversation (newest first).
   */
  async findRecentByConversationId(
    conversationId: string,
    limit: number = 10
  ): Promise<ConversationMemory[]> {
    return prisma.conversationMemory.findMany({
      where: { conversationId },
      // Ensure deterministic ordering even if multiple rows share the same createdAt timestamp.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  /**
   * Get all messages for a conversation (oldest first).
   */
  async findByConversationId(conversationId: string): Promise<ConversationMemory[]> {
    return prisma.conversationMemory.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export default new ConversationMemoryRepository();

