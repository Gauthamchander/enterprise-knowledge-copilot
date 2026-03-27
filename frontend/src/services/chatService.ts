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

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (payload: ChatAnswer) => void;
  onError: (message: string) => void;
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

  streamQuery: async (
    params: {
      query: string;
      conversationId?: string;
      maxResults?: number;
      scoreThreshold?: number;
    },
    callbacks: StreamCallbacks
  ): Promise<void> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const { query, conversationId, maxResults = 5, scoreThreshold = 0.5 } = params;

    const response = await fetch(`${API_BASE_URL}/api/chat/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        conversationId,
        maxResults,
        scoreThreshold,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const lines = block.split('\n');
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            dataLine += line.replace('data:', '').trim();
          }
        }

        if (!dataLine) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (currentEvent === 'token') {
          callbacks.onToken(parsed.token || '');
        } else if (currentEvent === 'done') {
          callbacks.onDone(parsed as ChatAnswer);
        } else if (currentEvent === 'error') {
          callbacks.onError(parsed.message || 'Streaming failed');
        }
      }
    }
  },
};

