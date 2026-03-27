/**
 * Chat Routes — endpoints for querying the knowledge base.
 * 
 * Protected by:
 * - authenticate middleware (verifies JWT token)
 * - All authenticated users can query
 */
import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import chatController from '../controllers/chatController';

const router = Router();

// Query schema validation
const querySchema = Joi.object({
  query: Joi.string().min(1).required().messages({
    'string.min': 'Query must be at least 1 character',
    'any.required': 'Query is required',
    'string.empty': 'Query cannot be empty',
  }),
  conversationId: Joi.string().uuid().optional().messages({
    'string.guid': 'conversationId must be a valid UUID',
  }),
  maxResults: Joi.number().integer().min(1).max(20).optional().messages({
    'number.min': 'maxResults must be at least 1',
    'number.max': 'maxResults cannot exceed 20',
    'number.integer': 'maxResults must be an integer',
  }),
  scoreThreshold: Joi.number().min(0).max(1).optional().messages({
    'number.min': 'scoreThreshold must be between 0 and 1',
    'number.max': 'scoreThreshold must be between 0 and 1',
  }),
});

// Query route - requires authentication
router.post('/query',authenticate, validate({ body: querySchema }), 
            chatController.query.bind(chatController)
);

// Streaming query route - requires authentication
router.post(
  '/query/stream',
  authenticate,
  validate({ body: querySchema }),
  chatController.queryStream.bind(chatController)
);

// Conversation messages route - requires authentication
router.get(
  '/conversations/:id/messages',
  authenticate,
  chatController.getConversationMessages.bind(chatController)
);

export default router;
