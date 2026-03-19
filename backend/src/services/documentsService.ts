/**
 * Documents Service — business logic layer for documents.
 * 
 * Handles:
 * - File operations (save, delete)
 * - AI Service communication
 * - Business rules and validation
 * 
 * Controllers should call this service, not repositories directly.
 */
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import documentRepository from '../repositories/documentRepository';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

export interface UploadDocumentData {
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  uploadedBy: string;
}

export interface DocumentWithFile {
  file: Express.Multer.File;
  uploadedBy: string;
}

export class DocumentsService {
  private aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: string) {
    return documentRepository.findByUserId(userId);
  }

  /**
   * Upload and process a document
   * 
   * Flow:
   * 1. Generate documentId (collection ID)
   * 2. Save file to disk (already done by multer)
   * 3. Send to AI service for processing
   * 4. Save metadata to database
   */
  async uploadDocument(data: DocumentWithFile) {
    const { file, uploadedBy } = data;

    // Generate unique document ID (collection ID)
    const documentId = uuidv4();

    // File is already saved by multer to uploads/documents/
    const filePath = path.join('uploads/documents', file.filename);

    try {
      // Send to AI Service for processing
      const aiResult = await this.sendToAIService(filePath, file.originalname, documentId);

      // Save metadata to database
      const document = await documentRepository.create({
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        filePath: filePath,
        uploadedBy: uploadedBy,
        numChunks: aiResult.num_chunks || 0,
        documentId: documentId,
      });

      logger.info({ documentId: document.id, userId: uploadedBy, fileName: file.originalname }, 'Document uploaded and processed');

      return document;
    } catch (error) {
      // Clean up file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  /**
   * Delete a document completely
   * 
   * Flow:
   * 1. Get document from database
   * 2. Delete file from filesystem
   * 3. Delete chunks from Qdrant via AI service
   * 4. Delete record from database
   */
  async deleteDocument(documentId: string, userId: string) {
    // Get document from database
    const document = await documentRepository.findById(documentId);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Check if user owns the document
    if (document.uploadedBy !== userId) {
      throw new AppError('Not authorized to delete this document', 403);
    }

    // 1. Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
      logger.info({ filePath: document.filePath }, 'File deleted from filesystem');
    }

    // 2. Delete chunks from Qdrant via AI Service
    try {
      await this.deleteFromAIService(document.documentId);
      logger.info({ documentId: document.documentId }, 'Chunks deleted from Qdrant');
    } catch (error) {
      logger.warn({ documentId: document.documentId }, 'Failed to delete chunks from Qdrant');
      // Continue anyway - we'll delete from DB
    }

    // 3. Delete from database
    await documentRepository.delete(documentId);

    logger.info({ documentId: documentId, userId: userId }, 'Document deleted completely');

    return { success: true };
  }

  /**
   * Send file to AI service for processing
   */
  private async sendToAIService(filePath: string, originalName: string, documentId: string) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), originalName);
      formData.append('documentId', documentId);

      const response = await axios.post(
        `${this.aiServiceUrl}/api/ingestion/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      logger.error({ error: errorMessage, filePath, status: error.response?.status }, 'AI service failed to process document');
      throw new AppError(`Failed to process document in AI service: ${errorMessage}`, error.response?.status || 500);
    }
  }

  /**
   * Delete document chunks from AI service
   */
  private async deleteFromAIService(documentId: string) {
    try {
      const response = await axios.delete(
        `${this.aiServiceUrl}/api/ingestion/delete-document/${documentId}`
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      throw new Error(`Failed to delete chunks from AI service: ${errorMessage}`);
    }
  }
}

export default new DocumentsService();
