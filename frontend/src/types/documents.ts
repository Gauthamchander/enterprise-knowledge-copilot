export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  numChunks: number;
  status: IngestionStatus;
  failedReason?: string | null;
  processedChunks: number;
  totalChunks: number;
}

export interface DocumentsResponse {
  status: 'success' | 'error';
  data?: {
    documents: Document[];
  };
  message?: string;
}

export interface UploadResponse {
  status: 'success' | 'accepted' | 'error';
  data?: {
    document: Document;
    message?: string;
  };
  message?: string;
}

export type IngestionStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
