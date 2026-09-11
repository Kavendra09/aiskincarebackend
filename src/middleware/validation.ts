import { Request, Response, NextFunction } from 'express';
import { validationResult, FieldValidationError } from 'express-validator';
import { ApiResponse } from '../utils/apiResponse';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => {
      const fieldError = err as FieldValidationError;
      return {
        field: fieldError.path || (err as any).param || 'unknown',
        message: err.msg,
      };
    });

    return ApiResponse.error(res, 'Validation failed', formattedErrors, 400);
  }
  next();
};
