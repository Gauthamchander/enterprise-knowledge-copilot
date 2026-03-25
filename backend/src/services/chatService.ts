/**
 * Chat Service — business logic layer for chat/queries.
 * 
 * Handles:
 * - Querying the AI service (RAG system)
 * - Enhancing citations with document metadata
 * - Formatting responses for the frontend
 * 
 * Controllers should call this service, not repositories directly.
 */
import axios from 'axios';
import conversationRepository from '../repositories/conversationRepository';
import conversationMemoryRepository from '../repositories/conversationMemoryRepository';
import documentRepository from '../repositories/documentRepository';
import queryLogRepository from '../repositories/queryLogRepository';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

export interface QueryRequest {
  query: string;
  maxResults?: number;
  scoreThreshold?: number;
  conversationId?: string;
  userId?: string;
  orgId?: string | null;
  departmentId?: string | null;
}

export interface EnhancedSource {
  text: string;
  score: number;
  documentName: string;
  fileName: string;
  chunkIndex: number;
  documentId: string;
  uploadedAt?: Date;
  fileType?: string;
}

export interface QueryResponse {
  conversationId?: string;
  answer: string;
  sources: EnhancedSource[];
  query: string;
}

export class ChatService {
  private aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  /**
   * Query the knowledge base using RAG
   * 
   * Flow:
   * 1. Send query to AI service
   * 2. Get answer with raw sources
   * 3. Enhance sources with document metadata from database
   * 4. Return formatted response
   */
  async queryKnowledgeBase(request: QueryRequest): Promise<QueryResponse> {
    const { query, maxResults = 5, scoreThreshold = 0.5, conversationId } = request;

    if (!query || query.trim().length === 0) {
      throw new AppError('Query cannot be empty', 400);
    }

    try {
      logger.info({ query, maxResults, scoreThreshold }, 'Querying knowledge base');
      const startTime = Date.now();
      let activeConversationId = conversationId;

      // Step 0: Resolve conversation context (create if missing)
      if (request.userId) {
        if (activeConversationId) {
          const existingConversation = await conversationRepository.findByIdAndUserId(
            activeConversationId,
            request.userId
          );
          if (!existingConversation) {
            throw new AppError('Conversation not found', 404);
          }
        } else {
          const newConversation = await conversationRepository.create({
            userId: request.userId,
            organisationId: request.orgId ?? null,
          });
          activeConversationId = newConversation.id;
        }
      }

      // Step 0.5: Load recent memory and build a context-aware query
      const { contextualQuery, previousUserQuestion } = await this.buildContextualQuery(
        activeConversationId,
        query
      );

      // Step 0.75: Short-circuit for "previous question" meta-queries.
      // The LLM cannot reliably answer these from history — answer directly from memory.
      const isPreviousQuestionQuery = /previous\s+question|what\s+did\s+i\s+ask|what\s+was\s+my\s+(last|latest)\s+(question|query)/i.test(query.trim());
      if (isPreviousQuestionQuery && previousUserQuestion) {
        const answer = `Your previous question was: "${previousUserQuestion}"`;
        const responseTimeMs = Date.now() - startTime;

        if (request.userId && activeConversationId) {
          await conversationMemoryRepository.create({
            conversationId: activeConversationId,
            userId: request.userId,
            role: 'user',
            content: query,
          });
          await conversationMemoryRepository.create({
            conversationId: activeConversationId,
            userId: request.userId,
            role: 'assistant',
            content: answer,
          });
          await queryLogRepository.create({
            userId: request.userId,
            orgId: request.orgId ?? null,
            departmentId: request.departmentId ?? null,
            question: query,
            response: answer,
            responseTimeMs,
            documentIdsUsed: [],
          });
        }

        logger.info({ query }, 'Answered previous-question meta-query directly from memory');
        return {
          conversationId: activeConversationId,
          answer,
          sources: [],
          query,
        };
      }

      // Step 1: Call AI service
      const aiResponse = await this.queryAIService(contextualQuery, maxResults, scoreThreshold);

      // Step 2: Enhance sources with document metadata
      const enhancedSources = await this.enhanceSources(aiResponse.sources);
      const responseTimeMs = Date.now() - startTime;
      const documentIdsUsed = Array.from(
        new Set(
          enhancedSources
            .map((source) => source.documentId)
            .filter((id) => id && id !== 'unknown')
        )
      );

      // Step 3: Persist question/response log for auditability
      if (request.userId) {
        // Save user and assistant turns to conversation memory for future follow-ups
        if (activeConversationId) {
          await conversationMemoryRepository.create({
            conversationId: activeConversationId,
            userId: request.userId,
            role: 'user',
            content: query,
          });

          await conversationMemoryRepository.create({
            conversationId: activeConversationId,
            userId: request.userId,
            role: 'assistant',
            content: aiResponse.answer,
          });
        }

        await queryLogRepository.create({
          userId: request.userId,
          orgId: request.orgId ?? null,
          departmentId: request.departmentId ?? null,
          question: query,
          response: aiResponse.answer,
          responseTimeMs,
          documentIdsUsed,
        });
      }

      logger.info(
        { 
          query, 
          answerLength: aiResponse.answer.length, 
          sourcesCount: enhancedSources.length,
          logged: !!request.userId,
        }, 
        'Query completed successfully'
      );

      return {
        conversationId: activeConversationId,
        answer: aiResponse.answer,
        sources: enhancedSources,
        query: aiResponse.query,
      };
    } catch (error: any) {
      logger.error({ error: error.message, query }, 'Failed to query knowledge base');
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Failed to query knowledge base: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Build query text augmented with recent conversation memory.
   * Keeps memory window small to avoid overly large prompts.
   */
  private async buildContextualQuery(
    conversationId: string | undefined,
    currentQuery: string
  ): Promise<{ contextualQuery: string; previousUserQuestion: string }> {
    if (!conversationId) {
      return { contextualQuery: currentQuery, previousUserQuestion: '' };
    }

    const recent = await conversationMemoryRepository.findRecentByConversationId(
      conversationId,
      6
    );

    if (recent.length === 0) {
      return { contextualQuery: currentQuery, previousUserQuestion: '' };
    }

    // Repository returns newest-first. Reverse to oldest-first for chronological context.
    const ordered = [...recent].reverse();

    // Find the most recent user turn — used to answer "previous question" queries directly.
    const lastUserMessage = [...ordered].reverse().find((msg) => msg.role === 'user');
    const previousUserQuestion = lastUserMessage ? lastUserMessage.content : '';

    const history = ordered
      .map((msg) => {
        const trimmedContent = msg.content.length > 600 ? `${msg.content.slice(0, 600)}...` : msg.content;
        const speaker = msg.role === 'assistant' ? 'Assistant' : 'User';
        return `${speaker}: ${trimmedContent}`;
      })
      .join('\n');

    const contextualQuery = [
      'Use the following recent conversation history to resolve references in the current question.',
      'If the answer is present in the conversation history, you may use it.',
      '',
      'Recent conversation history:',
      history,
      '',
      `Current question: ${currentQuery}`,
    ].join('\n');

    return { contextualQuery, previousUserQuestion };
  }

  /**
   * Call AI service query endpoint
   */
  private async queryAIService(
    query: string,
    maxResults: number,
    scoreThreshold: number
  ) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/query/`,
        {
          query,
          max_results: maxResults,
          score_threshold: scoreThreshold,
        },
        {
          timeout: 90000, // 90 second timeout (LLM calls may take longer during cold-start / rate-limit)
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        (error?.code === 'ECONNABORTED' ? 'AI service request timed out' : undefined) ||
        error.message ||
        'Unknown error';
      logger.error(
        { 
          error: errorMessage, 
          status: error.response?.status,
          query 
        }, 
        'AI service query failed'
      );
      throw new AppError(
        `AI service query failed: ${errorMessage}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Enhance sources with document metadata from database
   * 
   * For each source, we look up the document by documentId
   * and add metadata like document name, upload date, etc.
   */
  private async enhanceSources(
    rawSources: Array<{
      text: string;
      score: number;
      metadata: {
        source?: string;
        documentId?: string;
        chunk_index?: number;
        file_type?: string;
        [key: string]: any;
      };
    }>
  ): Promise<EnhancedSource[]> {
    const enhancedSources: EnhancedSource[] = [];

    for (const source of rawSources) {
      const documentId = source.metadata?.documentId;
      const fileName = source.metadata?.source || 'Unknown';
      const chunkIndex = source.metadata?.chunk_index ?? 0;

      // Try to get document metadata from database
      let documentName = fileName;
      let uploadedAt: Date | undefined;
      let fileType: string | undefined = source.metadata?.file_type;

      if (documentId) {
        try {
          const document = await documentRepository.findByDocumentId(documentId);
          if (document) {
            documentName = document.fileName;
            uploadedAt = document.uploadedAt;
            fileType = document.fileType;
          }
        } catch (error) {
          logger.warn(
            { documentId, error: (error as Error).message },
            'Failed to fetch document metadata'
          );
          // Continue with default values
        }
      }

      enhancedSources.push({
        text: source.text,
        score: source.score,
        documentName,
        fileName,
        chunkIndex,
        documentId: documentId || 'unknown',
        uploadedAt,
        fileType,
      });
    }

    return enhancedSources;
  }
}

export default new ChatService();
