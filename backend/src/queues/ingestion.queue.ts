import { Queue, JobsOptions } from 'bullmq';
import { getBullMQConnection } from '../config/redis';

export type IngestionJobData = {
  documentId: string;
  filePath: string;
  userId?: string;
  // add more fields as needed (e.g., source, mimeType, etc.)
};

export const INGESTION_QUEUE_NAME = 'ingestion';

// Reasonable defaults for most ingestion workloads
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: {
    age: 60 * 60, // keep successful jobs for 1 hour
    count: 1000,  // or up to 1000 jobs, whichever first
  },
  removeOnFail: {
    age: 24 * 60 * 60, // keep failed jobs for 24 hours
  },
};

export const ingestionQueue = new Queue<IngestionJobData>(
  INGESTION_QUEUE_NAME,
  {
    ...getBullMQConnection(),
    defaultJobOptions,
  }
);

export async function addIngestionJob(data: IngestionJobData, opts?: JobsOptions) {
  return ingestionQueue.add('ingest-document', data, opts);
}

