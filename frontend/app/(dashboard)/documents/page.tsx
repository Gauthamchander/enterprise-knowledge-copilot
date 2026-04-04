'use client';

/**
 * Documents Page — superadmin only.
 * Allows uploading documents and viewing the list of uploaded documents.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { documentsService } from '@/src/services/documentsService';
import { Document, IngestionStatus } from '@/src/types/documents';
import { ROUTES } from '@/src/constants/routes';
import Button from '@/src/components/ui/Button';
import { useDocumentsPolling } from '@/src/hooks/useDocumentsPolling';

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Poll documents periodically to reflect async ingestion
  const { documents: polledDocs, loading: pollingLoading, error: pollingError, anyProcessing, forceRefresh } = useDocumentsPolling(2000);

  // Redirect if not superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      router.push(ROUTES.DASHBOARD);
    }
  }, [user, router]);

  // Bridge polled docs into local state (for minimal change)
  useEffect(() => {
    if (user?.role === 'superadmin') {
      setDocuments(polledDocs);
      setIsLoading(pollingLoading);
      if (pollingError) setError(pollingError);
    }
  }, [user, polledDocs, pollingLoading, pollingError]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docs = await documentsService.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadSuccess(false);

      await documentsService.uploadDocument(file);
      setUploadSuccess(true);

      // Restart polling so the new document appears immediately
      forceRefresh();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(documentId);
      setError(null);
      await documentsService.deleteDocument(documentId);
      
      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatusBadge = ({ status }: { status?: IngestionStatus | null }) => {
    const s = status ?? 'QUEUED';
    const cls =
      s === 'QUEUED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
      s === 'PROCESSING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
      s === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
      'bg-red-50 text-red-700 border-red-200';
    return <span className={`px-2 py-1 text-xs rounded border ${cls}`}>{s.toLowerCase()}</span>;
  };

  const Progress = ({ processed, total }: { processed: number; total: number }) => {
    const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
    return (
      <div className="w-48">
        <div className="flex justify-between text-xs mb-1">
          <span>{processed}/{total}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded">
          <div className="bg-indigo-600 h-2 rounded" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  // Show loading state
  if (isLoading && documents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">Upload and manage documents</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Upload Document</h2>
          <Button
            onClick={handleUploadClick}
            variant="primary"
            isLoading={isUploading}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md"
        />

        {error && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
            Document uploaded successfully!
          </div>
        )}

        <p className="text-sm text-gray-500 mt-2">
          Supported formats: PDF, DOC, DOCX, TXT, MD
        </p>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Uploaded Documents ({documents.length})
          </h2>
          <Button
            onClick={fetchDocuments}
            variant="secondary"
            disabled={isLoading}
            className="text-sm"
          >
            Refresh
          </Button>
        </div>

        {anyProcessing && (
          <div className="mb-4 p-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
            Processing… The list will update automatically when ingestion completes.
          </div>
        )}

        {isLoading && documents.length > 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No documents uploaded yet</p>
            <p className="text-sm text-gray-400">Click &quot;Upload Document&quot; to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doc.name || doc.fileName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{doc.fileType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(doc.uploadedAt)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={doc.status} />
                      {doc.status === 'FAILED' && doc.failedReason && (
                        <div className="text-xs text-red-600 mt-1">Reason: {doc.failedReason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.status === 'COMPLETED' ? (
                        <div className="text-xs text-green-700">Done ({doc.numChunks} chunks)</div>
                      ) : doc.status === 'FAILED' ? (
                        <div className="text-xs text-red-600">Failed</div>
                      ) : (
                        <Progress processed={doc.processedChunks || 0} total={doc.totalChunks || 0} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={isDeleting === doc.id}
                        className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {isDeleting === doc.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
