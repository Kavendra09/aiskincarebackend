import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { ENV } from '../config/environment';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // Log error details for diagnosis
  logger.error(`[Error] ${req.method} ${req.originalUrl}:`, {
    name: err.name,
    message: err.message,
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(res, 'File size exceeds maximum allowed limit of 5MB', [], 400);
    }
    return ApiResponse.error(res, `Upload error: ${err.message}`, [], 400);
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return ApiResponse.error(res, message, [], 404);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Please use another value`;
    return ApiResponse.error(
      res,
      message,
      [{ field, message: `${field} already exists` }],
      409
    );
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val: any) => ({
      field: val.path,
      message: val.message,
    }));
    return ApiResponse.error(res, 'Validation failed', errors, 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid authentication token', [], 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Authentication token has expired', [], 401);
  }

  // Handle Custom Operational ApiError
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.errors, err.statusCode);
  }

  // Generic internal server error
  const statusCode = err.statusCode || 500;
  const message =
    ENV.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return ApiResponse.error(res, message, [], statusCode);
};
