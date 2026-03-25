/**
 * Chat Service — frontend API wrapper for chat/QA.
 *
 * UI components should call this service rather than hitting the backend directly.
 */
import { apiRequest } from '@/src/lib/api';

export interface ChatSource {
  text: string;
  score: number;
  documentName: string;
  fileName: string;
  chunkIndex: number;
  documentId: string;
  uploadedAt?: string;
  fileType?: string;
}

export interface ChatAnswer {
  conversationId?: string;
  answer: string;
  sources: ChatSource[];
  query: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: string; // 'user' | 'assistant'
  content: string;
  createdAt: string;
}

export const chatService = {
  query: async (params: {
    query: string;
    conversationId?: string;
    maxResults?: number;
    scoreThreshold?: number;
  }): Promise<ChatAnswer> => {
    const { query, conversationId, maxResults = 5, scoreThreshold = 0.5 } = params;

    const response = await apiRequest<{ status: 'success' | 'error'; data?: ChatAnswer }>(
      '/api/chat/query',
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          conversationId,
          maxResults,
          scoreThreshold,
        }),
      }
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    // apiRequest throws on non-2xx or {status:'error'}, but keep this for safety.
    throw new Error('Failed to fetch chat answer');
  },

  getConversationMessages: async (conversationId: string): Promise<ConversationMessage[]> => {
    const response = await apiRequest<{
      status: 'success' | 'error';
      data?: { messages: ConversationMessage[] };
    }>(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'GET',
    });

    if (response.status === 'success' && response.data?.messages) {
      return response.data.messages;
    }

    throw new Error(response.status === 'error' ? 'Failed to load messages' : 'No messages found');
  },
};

