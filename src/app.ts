import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/environment';
import v1Routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { ApiResponse } from './utils/apiResponse';

const app: Application = express();

// Security Middlewares
app.use(helmet());
// Enable CORS for all mobile (Expo) and client requests
app.use(cors());

// Global API rate limiting
const generalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errors: [],
  },
});
app.use('/api', generalLimiter);

// Logging
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  return ApiResponse.success(
    res,
    'AISkinCare Backend API is healthy and running',
    {
      status: 'healthy',
      environment: ENV.NODE_ENV,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
    200
  );
});

// Mount V1 API Routes
app.use('/api/v1', v1Routes);

// 404 Handler
app.use((req: Request, res: Response) => {
  return ApiResponse.error(
    res,
    `Resource not found: ${req.method} ${req.originalUrl}`,
    [],
    404
  );
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
