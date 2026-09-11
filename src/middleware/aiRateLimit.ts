import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ENV } from '../config/environment';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Dedicated rate limiter for AI skin analysis endpoints.
 * Keys by authenticated user ID (or fallback to client IP).
 * Throws controlled 429 with 'AI_RATE_LIMITED' error code.
 */
export const aiAnalysisLimiter = rateLimit({
  windowMs: ENV.AI_RATE_LIMIT_WINDOW_MS,
  max: ENV.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  keyGenerator: (req: Request) => {
    return (req as any).user?._id?.toString() || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    return ApiResponse.error(
      res,
      'AI skin analysis rate limit reached. Please wait before requesting another analysis.',
      [],
      429,
      'AI_RATE_LIMITED'
    );
  },
});
