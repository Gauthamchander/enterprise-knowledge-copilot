import { Request, Response, NextFunction } from 'express';
import chatService from '../services/chatService';
import logger from '../config/logger';

export class ChatController {
  /**
   * POST /api/chat/query
   * Query the knowledge base using RAG
   */
  async query(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, maxResults, scoreThreshold } = req.body;
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
}

export default new ChatController();
