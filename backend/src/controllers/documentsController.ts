import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import documentsService from '../services/documentsService';
import { AppError } from '../middlewares/errorHandler';
import documentRepository from '../repositories/documentRepository';
import { enqueueIngestion } from '../queues/enqueue';

export class DocumentsController {
  /**
   * GET /api/documents
   * Get all documents (superadmin only)
   */
  async getAllDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const documents = await documentsService.getUserDocuments(req.user!.id);

      logger.info({ userId: req.user?.id, count: documents.length }, 'Documents fetched by superadmin');

      return res.status(200).json({
        status: 'success',
        data: { documents },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents
   * Create/upload a new document (superadmin only)
   */
  async createDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      const document = await documentsService.uploadDocument({
        file,
        uploadedBy: req.user!.id,
      });

      return res.status(202).json({
        status: 'accepted',
        message: 'Document uploaded; ingestion scheduled',
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/documents/:id
   * Delete a document (superadmin only)
   */
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const documentId = typeof id === 'string' ? id : id[0]; // Ensure it's a string

      await documentsService.deleteDocument(documentId, req.user!.id);

      return res.status(200).json({
        status: 'success',
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/:id/reingest
   * Enqueue a document for async re-ingestion (superadmin only)
   */
  async reingestDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const documentId = typeof id === 'string' ? id : id[0];

      const doc = await documentRepository.findById(documentId);
      if (!doc) {
        throw new AppError('Document not found', 404);
      }

      // Optional ownership check if you want to restrict further:
      // if (doc.uploadedBy !== req.user!.id) { throw new AppError('Not authorized', 403); }

      await enqueueIngestion(doc.documentId, doc.filePath, req.user?.id);

      logger.info({ documentId: doc.documentId, userId: req.user?.id }, 'Re-ingestion job enqueued');

      return res.status(202).json({
        status: 'accepted',
        message: 'Re-ingestion job enqueued',
        data: { documentId: doc.documentId },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DocumentsController();
