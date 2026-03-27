import { Request, Response, NextFunction } from 'express';
import chatService from '../services/chatService';
import logger from '../config/logger';
import conversationRepository from '../repositories/conversationRepository';
import conversationMemoryRepository from '../repositories/conversationMemoryRepository';

export class ChatController {
  /**
   * POST /api/chat/query
   * Query the knowledge base using RAG
   */
  async query(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, maxResults, scoreThreshold, conversationId } = req.body;
      const userId = req.user!.id;

      if (!query) {
        return res.status(400).json({
          status: 'error',
          message: 'Query is required',
        });
      }

      logger.info({ userId, query }, 'Chat query received');

      const result = await chatService.queryKnowledgeBase({
        query,
        maxResults,
        scoreThreshold,
        conversationId,
        userId: req.user!.id,
        orgId: req.user?.organisationId ?? null,
        departmentId: req.user?.departmentId ?? null,
      });

      logger.info(
        { 
          userId, 
          query, 
          sourcesCount: result.sources.length,
          answerLength: result.answer.length 
        }, 
        'Chat query completed'
      );

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error); // Pass to error handler middleware
    }
  }

  /**
   * POST /api/chat/query/stream
   * Streams chat response using SSE.
   */
  async queryStream(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, maxResults, scoreThreshold, conversationId } = req.body;
      const userId = req.user!.id;

      if (!query) {
        return res.status(400).json({
          status: 'error',
          message: 'Query is required',
        });
      }

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      logger.info({ userId, query }, 'Chat stream query received');

      const result = await chatService.queryKnowledgeBaseStream(
        {
          query,
          maxResults,
          scoreThreshold,
          conversationId,
          userId: req.user!.id,
          orgId: req.user?.organisationId ?? null,
          departmentId: req.user?.departmentId ?? null,
        },
        {
          onToken: (token) => {
            res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
          },
        }
      );

      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    } catch (error) {
      if (res.headersSent) {
        const message = error instanceof Error ? error.message : 'Streaming failed';
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        return res.end();
      }
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id/messages
   * Return conversation messages (oldest first).
   */
  async getConversationMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const convoId = Array.isArray(id) ? id[0] : id;
      const userId = req.user!.id;

      // Ownership check
      const convo = await conversationRepository.findByIdAndUserId(convoId, userId);
      if (!convo) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found',
        });
      }

      const messages = await conversationMemoryRepository.findByConversationId(convoId);

      return res.status(200).json({
        status: 'success',
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ChatController();
