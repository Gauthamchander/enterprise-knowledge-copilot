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
}

export default new DocumentRepository();
