import app from './app';
import { ENV } from './config/environment';
import { connectDB, disconnectDB } from './config/database';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // Attempt Database Connection
    if (ENV.MONGO_URI) {
      await connectDB().catch((err) => {
        logger.warn(
          `[Warning] Direct database connection failed: ${err.message}. If running in offline dev, configure a valid MONGO_URI in .env`
        );
      });
    }

    const server = app.listen(ENV.PORT, () => {
      logger.info(`✨ AISkinCareBackend server running in [${ENV.NODE_ENV}] mode on port ${ENV.PORT}`);
      logger.info(`🚀 API base: http://localhost:${ENV.PORT}/api/v1`);
      logger.info(`💓 Health: http://localhost:${ENV.PORT}/api/health`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        logger.info('Server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err: any) => {
      logger.error('Unhandled Promise Rejection:', err);
    });

    process.on('uncaughtException', (err: any) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
