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
    statusCode: number = 500,
    code?: string
  ): Response {
    const payload: Record<string, any> = {
      success: false,
      message,
      errors,
    };

    if (code) {
      payload.code = code;
    }

    return res.status(statusCode).json(payload);
  }
}
