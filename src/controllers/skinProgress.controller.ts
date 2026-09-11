import { Request, Response } from 'express';
import { param, query, body } from 'express-validator';
import { SkinProgressService } from '../services/skinProgress.service';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

export const progressIdValidator = [
  param('id').isMongoId().withMessage('Invalid progress ID format'),
];

export const progressPaginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

export class SkinProgressController {
  static createProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const frontFile = files?.['front']?.[0];
    const leftFile = files?.['left']?.[0];
    const rightFile = files?.['right']?.[0];

    if (!frontFile) {
      throw ApiError.badRequest('Front angle photo is required');
    }

    const progress = await SkinProgressService.createProgress(userId, {
      frontFile,
      leftFile,
      rightFile,
      notes: req.body.notes,
    });

    return ApiResponse.success(res, 'Skin progress record created successfully', progress, 201);
  });

  static getProgressHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await SkinProgressService.getProgressHistory(userId, page, limit);

    return ApiResponse.success(
      res,
      'Skin progress history retrieved successfully',
      result.entries,
      200,
      result.pagination
    );
  });

  static getProgressById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const progress = await SkinProgressService.getProgressById(userId, req.params.id as string);
    return ApiResponse.success(res, 'Skin progress retrieved successfully', progress, 200);
  });

  static deleteProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await SkinProgressService.deleteProgress(userId, req.params.id as string);
    return ApiResponse.success(res, 'Skin progress record deleted successfully', result, 200);
  });
}
