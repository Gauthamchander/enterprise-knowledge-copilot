import { JobsOptions } from 'bullmq';
import { addIngestionJob, IngestionJobData } from './ingestion.queue';

export async function enqueueIngestion(
  documentId: string,
  filePath: string,
  userId?: string,
  options?: JobsOptions
) {
  const data: IngestionJobData = { documentId, filePath, userId };
  return addIngestionJob(data, options);
}

