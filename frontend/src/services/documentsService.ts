/**
 * Documents Service — business logic layer for documents.
 */
import { documentsApi } from '@/src/lib/api';
import { DocumentsResponse, UploadResponse, Document } from '@/src/types/documents';

export const documentsService = {
  /**
   * Fetches all documents.
   */
  getAllDocuments: async (): Promise<Document[]> => {
    try {
      const response = (await documentsApi.getAll()) as DocumentsResponse;

      if (response.status === 'success' && response.data) {
        return response.data.documents;
      }

      throw new Error(response.message || 'Failed to fetch documents');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch documents');
    }
  },

  /**
   * Uploads a document.
   */
  uploadDocument: async (file: File): Promise<Document> => {
    try {
      const response = (await documentsApi.upload(file)) as UploadResponse;

      if ((response.status === 'success' || response.status === 'accepted') && response.data?.document) {
        return response.data.document;
      }

      throw new Error(response.message || 'Failed to upload document');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload document');
    }
  },

  /**
   * Deletes a document.
   */
  deleteDocument: async (documentId: string): Promise<void> => {
    try {
      const response = await documentsApi.delete(documentId);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to delete document');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete document');
    }
  },
};
