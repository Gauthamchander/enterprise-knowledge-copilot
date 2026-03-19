export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DocumentsResponse {
  status: 'success' | 'error';
  data?: {
    documents: Document[];
  };
  message?: string;
}

export interface UploadResponse {
  status: 'success' | 'error';
  data?: {
    document: Document;
    message?: string;
  };
  message?: string;
}
