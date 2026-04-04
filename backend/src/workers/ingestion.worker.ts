import { Worker, QueueEvents, Job } from 'bullmq';
import { getBullMQConnection } from '../config/redis';
import logger from '../config/logger';
import { INGESTION_QUEUE_NAME, IngestionJobData } from '../queues/ingestion.queue';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import documentRepository from '../repositories/documentRepository';

// Queue events for observability (completed, failed, etc.)
const queueEvents = new QueueEvents(INGESTION_QUEUE_NAME, getBullMQConnection());

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info({ jobId, returnvalue }, `[${INGESTION_QUEUE_NAME}] job completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, `[${INGESTION_QUEUE_NAME}] job failed`);
});

// Worker that processes ingestion jobs
export const ingestionWorker = new Worker<IngestionJobData>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData>) => {
    const { documentId, filePath, userId } = job.data;

    logger.info(
      { jobId: job.id, documentId, filePath, userId },
      `[${INGESTION_QUEUE_NAME}] processing job`
    );

    // Mark as PROCESSING at the start
    await documentRepository.updateStatusByDocumentId(documentId, 'PROCESSING');

    // Call AI service to process and then update DB with progress and numChunks
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      const formData = new FormData();
      // original filename is unknown here; reuse basename of path
      formData.append('file', fs.createReadStream(filePath), filePath.split('/').pop() || filePath.split('\\').pop());
      formData.append('documentId', documentId);

      // Kick off upload to AI service
      const response = await axios.post(
        `${aiServiceUrl}/api/ingestion/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const totalChunks = Number(response.data?.num_chunks ?? 0);

      // For now, since AI service runs the whole pipeline, set processed=total when it returns
      await documentRepository.updateProgressByDocumentId(documentId, totalChunks, totalChunks);
      await documentRepository.updateNumChunksByDocumentId(documentId, totalChunks);

      // Also emit BullMQ progress for observability
      await job.updateProgress({ processed: totalChunks, total: totalChunks });

      // Mark as COMPLETED
      await documentRepository.updateStatusByDocumentId(documentId, 'COMPLETED');

      logger.info(
        { jobId: job.id, documentId, numChunks: totalChunks },
        `[${INGESTION_QUEUE_NAME}] ingestion completed via AI service`
      );

      return { processed: true, documentId, numChunks: totalChunks };
    } catch (err: any) {
      const reason = err?.message || 'Unknown error';
      await documentRepository.updateStatusByDocumentId(documentId, 'FAILED', reason);
      logger.error({ jobId: job.id, documentId, err: reason }, `[${INGESTION_QUEUE_NAME}] ingestion failed`);
      throw err;
    }
  },
  {
    ...getBullMQConnection(),
    concurrency: 3,
  }
);

ingestionWorker.on('active', (job) => {
  logger.debug({ jobId: job.id }, `[${INGESTION_QUEUE_NAME}] job active`);
});

ingestionWorker.on('error', (err) => {
  logger.error({ err }, `[${INGESTION_QUEUE_NAME}] worker error`);
});

// Graceful shutdown
async function shutdown() {
  try {
    await ingestionWorker.close();
    await queueEvents.close();
    logger.info(`[${INGESTION_QUEUE_NAME}] worker shut down`);
    process.exit(0);
  } catch (e) {
    logger.error({ e }, `[${INGESTION_QUEUE_NAME}] error during shutdown`);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

