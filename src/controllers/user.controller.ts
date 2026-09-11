import { Request, Response } from 'express';
import { body } from 'express-validator';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

export const updateProfileValidators = [
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('gender')
    .optional()
    .isIn(['female', 'male', 'non-binary', 'prefer-not-to-say', 'other'])
    .withMessage('Invalid gender value'),
  body('age').optional().isInt({ min: 10, max: 120 }).withMessage('Age must be between 10 and 120'),
  body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date'),
];

export class UserController {
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const user = await UserService.getProfile(userId);
    return ApiResponse.success(res, 'User profile fetched successfully', user, 200);
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const updatedUser = await UserService.updateProfile(userId, req.body);
    return ApiResponse.success(res, 'Profile updated successfully', updatedUser, 200);
  });

  static uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest('Avatar image file is required');
    }
    const userId = req.user!._id.toString();
    const result = await UserService.updateAvatar(userId, req.file.buffer);
    return ApiResponse.success(res, 'Profile avatar uploaded successfully', result, 200);
  });
}
