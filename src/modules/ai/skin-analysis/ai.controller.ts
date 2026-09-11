import { Request, Response } from 'express';
import { param, query } from 'express-validator';
import { AISkinAnalysisService } from './ai.service';
import { IUploadedPhotoInput } from './ai.types';
import { ApiResponse } from '../../../utils/apiResponse';
import { ApiError } from '../../../utils/apiError';
import { asyncHandler } from '../../../utils/asyncHandler';

export const analysisIdValidator = [
  param('id').isMongoId().withMessage('Invalid skin analysis ID format'),
];

export const analysisPaginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

export class AISkinAnalysisController {
  /**
   * POST /api/v1/ai/skin-analysis
   * Starts a new skin analysis from uploaded facial photo(s)
   */
  static startSkinAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!._id.toString();

    // Support both multi-field uploads (front, left, right) and single file upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const singleFile = req.file;

    // Support 'front', 'image' (single-photo upload from mobile), or fallback to req.file
    const frontFile = files?.['front']?.[0] || files?.['image']?.[0] || singleFile;
    const leftFile = files?.['left']?.[0];
    const rightFile = files?.['right']?.[0];

    if (!frontFile) {
      throw ApiError.imageInvalid(
        'Please upload a facial photo using the "front" or "image" field'
      );
    }

    const photos: IUploadedPhotoInput[] = [
      {
        buffer: frontFile.buffer,
        mimetype: frontFile.mimetype,
        originalname: frontFile.originalname,
        size: frontFile.size,
        angle: 'front',
      },
    ];

    if (leftFile) {
      photos.push({
        buffer: leftFile.buffer,
        mimetype: leftFile.mimetype,
        originalname: leftFile.originalname,
        size: leftFile.size,
        angle: 'left',
      });
    }

    if (rightFile) {
      photos.push({
        buffer: rightFile.buffer,
        mimetype: rightFile.mimetype,
        originalname: rightFile.originalname,
        size: rightFile.size,
        angle: 'right',
      });
    }

    const analysis = await AISkinAnalysisService.analyzeSkin({
      userId,
      photos,
      userContext: req.body.userContext,
    });

    if (analysis.status === 'rejected') {
      return res.status(422).json({
        success: false,
        code: 'IMAGE_QUALITY_INSUFFICIENT',
        message: analysis.rejectionMessage || 'Please upload a clear, well-lit facial photo.',
        data: analysis,
      });
    }

    return ApiResponse.success(
      res,
      'Skin analysis completed successfully',
      analysis,
      201
    );
  });

  /**
   * GET /api/v1/ai/skin-analysis/:id
   * Retrieves a specific skin analysis by ID
   */
  static getSkinAnalysisById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!._id.toString();
    const analysisId = req.params.id as string;

    const analysis = await AISkinAnalysisService.getAnalysisById(userId, analysisId);

    return ApiResponse.success(
      res,
      'Skin analysis retrieved successfully',
      analysis,
      200
    );
  });

  /**
   * GET /api/v1/ai/skin-analysis
   * Retrieves user's skin analysis history
   */
  static getSkinAnalysisHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!._id.toString();
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await AISkinAnalysisService.getAnalysisHistory(userId, page, limit);

    return ApiResponse.success(
      res,
      'Skin analysis history retrieved successfully',
      result.entries,
      200,
      result.pagination
    );
  });
}
