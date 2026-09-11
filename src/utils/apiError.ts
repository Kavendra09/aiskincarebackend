export class ApiError extends Error {
  public statusCode: number;
  public errors: any[];
  public isOperational: boolean;
  public errorCode?: string;

  constructor(
    statusCode: number,
    message: string,
    errors: any[] = [],
    isOperational = true,
    errorCode?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors: any[] = [], errorCode?: string): ApiError {
    return new ApiError(400, message, errors, true, errorCode);
  }

  static unauthorized(message: string = 'Unauthorized access', errorCode?: string): ApiError {
    return new ApiError(401, message, [], true, errorCode);
  }

  static forbidden(message: string = 'Forbidden action', errorCode?: string): ApiError {
    return new ApiError(403, message, [], true, errorCode);
  }

  static notFound(message: string = 'Resource not found', errorCode?: string): ApiError {
    return new ApiError(404, message, [], true, errorCode);
  }

  static conflict(message: string = 'Resource conflict', errorCode?: string): ApiError {
    return new ApiError(409, message, [], true, errorCode);
  }

  static internal(message: string = 'Internal server error', errorCode?: string): ApiError {
    return new ApiError(500, message, [], true, errorCode);
  }

  // Specific factory methods for AI & Skin Analysis errors
  static imageInvalid(message: string = 'Invalid image file or format', errors: any[] = []): ApiError {
    return new ApiError(400, message, errors, true, 'IMAGE_INVALID');
  }

  static imageQualityInsufficient(
    message: string = 'Please upload a clear, well-lit facial photo.',
    errors: any[] = []
  ): ApiError {
    return new ApiError(422, message, errors, true, 'IMAGE_QUALITY_INSUFFICIENT');
  }

  static aiProviderError(message: string = 'AI service temporarily unavailable'): ApiError {
    return new ApiError(502, message, [], true, 'AI_PROVIDER_ERROR');
  }

  static aiTimeout(message: string = 'AI analysis request timed out'): ApiError {
    return new ApiError(504, message, [], true, 'AI_TIMEOUT');
  }

  static aiRateLimited(
    message: string = 'AI skin analysis rate limit reached. Please wait before requesting another analysis.'
  ): ApiError {
    return new ApiError(429, message, [], true, 'AI_RATE_LIMITED');
  }

  static aiResponseInvalid(message: string = 'AI response validation failed', errors: any[] = []): ApiError {
    return new ApiError(502, message, errors, true, 'AI_RESPONSE_INVALID');
  }

  static analysisNotFound(message: string = 'Skin analysis record not found'): ApiError {
    return new ApiError(404, message, [], true, 'ANALYSIS_NOT_FOUND');
  }

  static unauthorizedAnalysisAccess(message: string = 'You do not have access to this analysis'): ApiError {
    return new ApiError(403, message, [], true, 'UNAUTHORIZED_ANALYSIS_ACCESS');
  }
}

