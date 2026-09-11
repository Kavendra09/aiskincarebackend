import { Notification, NotificationType } from '../models/Notification';
import { ApiError } from '../utils/apiError';

export interface ICreateNotificationDTO {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean
  ) {
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.min(50, Math.max(1, limit));
    const skip = (pageNumber - 1) * limitNumber;

    const query: Record<string, any> = { userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber) || 1,
      },
    };
  }

  static async markAsRead(userId: string, notificationId: string) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have access to this notification');
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  static async markAllAsRead(userId: string) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    return {
      modifiedCount: result.modifiedCount,
      message: 'All notifications marked as read',
    };
  }

  static async deleteNotification(userId: string, notificationId: string) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have access to this notification');
    }

    await Notification.findByIdAndDelete(notificationId);
    return { success: true };
  }

  static async createNotification(dto: ICreateNotificationDTO) {
    return await Notification.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type || 'system',
      metadata: dto.metadata || {},
    });
  }
}
