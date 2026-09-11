import { Request, Response } from 'express';
import { body } from 'express-validator';
import { SkinProfileService } from '../services/skinProfile.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { SKIN_TYPES, SKIN_CONCERNS } from '../models/SkinProfile';

export const createSkinProfileValidators = [
  body('skinType')
    .notEmpty()
    .withMessage('Skin type is required')
    .isIn(SKIN_TYPES)
    .withMessage(`Skin type must be one of: ${SKIN_TYPES.join(', ')}`),
  body('concerns')
    .optional()
    .isArray()
    .withMessage('Concerns must be an array'),
  body('concerns.*')
    .optional()
    .isIn(SKIN_CONCERNS)
    .withMessage(`Invalid concern value. Allowed concerns: ${SKIN_CONCERNS.join(', ')}`),
  body('lifestyle.waterIntakeLiters')
    .optional()
    .isFloat({ min: 0, max: 15 })
    .withMessage('Water intake must be between 0 and 15 liters'),
  body('lifestyle.sleepHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Sleep hours must be between 0 and 24'),
  body('lifestyle.sunscreenUsage')
    .optional()
    .isIn(['always', 'sometimes', 'rarely', 'never'])
    .withMessage('Sunscreen usage must be: always, sometimes, rarely, or never'),
  body('lifestyle.smokingStatus')
    .optional()
    .isIn(['non-smoker', 'occasional', 'regular'])
    .withMessage('Smoking status must be: non-smoker, occasional, or regular'),
  body('lifestyle.stressLevel')
    .optional()
    .isIn(['low', 'moderate', 'high'])
    .withMessage('Stress level must be: low, moderate, or high'),
];

export const updateSkinProfileValidators = [
  body('skinType')
    .optional()
    .isIn(SKIN_TYPES)
    .withMessage(`Skin type must be one of: ${SKIN_TYPES.join(', ')}`),
  body('concerns')
    .optional()
    .isArray()
    .withMessage('Concerns must be an array'),
  body('concerns.*')
    .optional()
    .isIn(SKIN_CONCERNS)
    .withMessage(`Invalid concern value. Allowed concerns: ${SKIN_CONCERNS.join(', ')}`),
  body('lifestyle.waterIntakeLiters')
    .optional()
    .isFloat({ min: 0, max: 15 }),
  body('lifestyle.sleepHours')
    .optional()
    .isFloat({ min: 0, max: 24 }),
  body('lifestyle.sunscreenUsage')
    .optional()
    .isIn(['always', 'sometimes', 'rarely', 'never']),
  body('lifestyle.smokingStatus')
    .optional()
    .isIn(['non-smoker', 'occasional', 'regular']),
  body('lifestyle.stressLevel')
    .optional()
    .isIn(['low', 'moderate', 'high']),
];

export class SkinProfileController {
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const profile = await SkinProfileService.getProfileByUserId(userId);
    return ApiResponse.success(res, 'Skin profile retrieved successfully', profile || {}, 200);
  });

  static createProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const profile = await SkinProfileService.createProfile(userId, req.body);
    return ApiResponse.success(res, 'Skin profile created successfully', profile, 201);
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const profile = await SkinProfileService.updateProfile(userId, req.body);
    return ApiResponse.success(res, 'Skin profile updated successfully', profile, 200);
  });

  static deleteProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await SkinProfileService.deleteProfile(userId);
    return ApiResponse.success(res, 'Skin profile deleted successfully', result, 200);
  });
}
