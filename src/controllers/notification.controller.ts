import { Request, Response } from 'express';
import { param, query } from 'express-validator';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationIdValidator = [
  param('id').isMongoId().withMessage('Invalid notification ID format'),
];

export const notificationQueryValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('isRead').optional().isBoolean(),
];

export class NotificationController {
  static getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const isRead =
      req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

    const result = await NotificationService.getNotifications(userId, page, limit, isRead);

    return ApiResponse.success(
      res,
      'Notifications retrieved successfully',
      {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      200,
      result.pagination
    );
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const notification = await NotificationService.markAsRead(userId, req.params.id as string);
    return ApiResponse.success(res, 'Notification marked as read', notification, 200);
  });

  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await NotificationService.markAllAsRead(userId);
    return ApiResponse.success(res, result.message, result, 200);
  });

  static deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await NotificationService.deleteNotification(userId, req.params.id as string);
    return ApiResponse.success(res, 'Notification deleted successfully', result, 200);
  });
}
