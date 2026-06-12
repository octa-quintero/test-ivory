import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { logger } from './config/winston.config';

const server = app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
