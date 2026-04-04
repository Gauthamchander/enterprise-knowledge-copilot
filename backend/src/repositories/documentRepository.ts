/**
 * Document Repository — handles all database operations for documents.
 * 
 * This layer abstracts database access - controllers and services
 * should never directly use Prisma. They use repositories instead.
 */
import prisma from '../prisma/client';
import { Document } from '@prisma/client';

export class DocumentRepository {
  /**
   * Find all documents uploaded by a user
   */
  async findByUserId(userId: string): Promise<Document[]> {
    return prisma.document.findMany({
      where: { uploadedBy: userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { id },
    });
  }

  /**
   * Find a document by documentId (collection ID)
   */
  async findByDocumentId(documentId: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { documentId },
    });
  }

  /**
   * Create a new document
   */
  async create(data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    filePath: string;
    uploadedBy: string;
    numChunks: number;
    documentId: string;
  }): Promise<Document> {
    return prisma.document.create({
      data,
    });
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<Document> {
    return prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Update numChunks using the documentId (collection ID)
   */
  async updateNumChunksByDocumentId(documentId: string, numChunks: number): Promise<Document> {
    return prisma.document.update({
      where: { documentId },
      data: { numChunks },
    });
  }

  /**
   * Update ingestion status (and optional failure reason) using the documentId (collection ID)
   */
  async updateStatusByDocumentId(
    documentId: string,
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    failedReason?: string
  ): Promise<Document> {
    const data: any = {
      status,
      failedReason: failedReason ?? null,
    };
    return prisma.document.update({
      where: { documentId },
      data,
    });
  }

  /**
   * Update progress counters using the documentId (collection ID).
   * Optionally updates totalChunks when provided. When processedChunks >= totalChunks,
   * also keeps numChunks in sync with processedChunks.
   */
  async updateProgressByDocumentId(
    documentId: string,
    processedChunks: number,
    totalChunks?: number
  ): Promise<Document> {
    const data: any = {
      processedChunks,
    };

    if (typeof totalChunks === 'number') {
      data.totalChunks = totalChunks;
      if (processedChunks >= totalChunks) {
        data.numChunks = processedChunks;
      }
    }

    return prisma.document.update({
      where: { documentId },
      data,
    });
  }
}

export default new DocumentRepository();
