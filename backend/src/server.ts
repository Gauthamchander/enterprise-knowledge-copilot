import app from './app';
import { config } from './config';
import logger from './config/logger';

const PORT = config.port;

// Optionally start the ingestion worker in the same process for development.
// Enable by setting ENABLE_INGESTION_WORKER=true in your env.
if (process.env.ENABLE_INGESTION_WORKER === 'true') {
  import('./workers/ingestion.worker')
    .then(() => logger.info('Ingestion worker started in API process'))
    .catch((err) => logger.error({ err }, 'Failed to start ingestion worker in API process'));
}

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});