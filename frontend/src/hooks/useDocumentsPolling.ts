import { useCallback, useEffect, useRef, useState } from 'react';
import { documentsService } from '@/src/services/documentsService';
import { Document } from '@/src/types/documents';

export function useDocumentsPolling(pollIntervalMs: number = 2000) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use a counter to allow external triggers to restart polling
  const [refreshTick, setRefreshTick] = useState(0);

  // Call this after an upload to restart polling
  const forceRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAndSchedule() {
      try {
        const docs = await documentsService.getAllDocuments();
        if (!cancelled) {
          setDocuments(docs);
          setError(null);
          setLoading(false);

          // Only keep polling while some docs are still in progress
          const stillProcessing = docs.some(
            (d) => !d.status || d.status === 'QUEUED' || d.status === 'PROCESSING'
          );

          if (stillProcessing) {
            timerRef.current = setTimeout(fetchAndSchedule, pollIntervalMs);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to fetch documents');
          setLoading(false);
          // retry on error
          timerRef.current = setTimeout(fetchAndSchedule, pollIntervalMs);
        }
      }
    }

    // Run on mount and whenever forceRefresh is called
    fetchAndSchedule();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pollIntervalMs, refreshTick]); // refreshTick causes re-run when forceRefresh is called

  // A doc is still processing if status is QUEUED or PROCESSING (or undefined for old rows)
  const anyProcessing = documents.some(
    (d) => !d.status || d.status === 'QUEUED' || d.status === 'PROCESSING'
  );

  return {
    documents,
    loading,
    error,
    anyProcessing,
    forceRefresh,
  };
}

