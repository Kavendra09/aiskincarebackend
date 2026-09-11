import mongoose from 'mongoose';
import { ENV } from './environment';
import { logger } from '../utils/logger';

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  const connectionUri = uri || ENV.MONGO_URI;

  try {
    const conn = await mongoose.connect(connectionUri);
    logger.info(`MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly');
  } catch (error: any) {
    logger.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};
