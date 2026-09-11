import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class DashboardController {
  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const data = await DashboardService.getDashboardData(userId);
    return ApiResponse.success(res, 'Dashboard data retrieved successfully', data, 200);
  });
}
