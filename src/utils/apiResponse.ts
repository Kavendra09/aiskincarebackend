import { Response } from 'express';

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string = 'Operation successful',
    data: T = {} as T,
    statusCode: number = 200,
    pagination?: IPaginationMeta
  ): Response {
    const responsePayload: Record<string, any> = {
      success: true,
      message,
      data,
    };

    if (pagination) {
      responsePayload.pagination = pagination;
    }

    return res.status(statusCode).json(responsePayload);
  }

  static error(
    res: Response,
    message: string = 'An error occurred',
    errors: any[] = [],
    statusCode: number = 500
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }
}
