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
import documentRepository from '../repositories/documentRepository';
import queryLogRepository from '../repositories/queryLogRepository';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

export interface QueryRequest {
  query: string;
  maxResults?: number;
  scoreThreshold?: number;
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
    const { query, maxResults = 5, scoreThreshold = 0.5 } = request;

    if (!query || query.trim().length === 0) {
      throw new AppError('Query cannot be empty', 400);
    }

    try {
      logger.info({ query, maxResults, scoreThreshold }, 'Querying knowledge base');
      const startTime = Date.now();

      // Step 1: Call AI service
      const aiResponse = await this.queryAIService(query, maxResults, scoreThreshold);

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
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
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
