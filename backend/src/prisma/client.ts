import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log queries in development (helps with debugging)
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug({ 
      query: e.query, 
      params: e.params, 
      duration: `${e.duration}ms` 
    });
  });
}

// Handle graceful shutdown (disconnect when app closes)
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;