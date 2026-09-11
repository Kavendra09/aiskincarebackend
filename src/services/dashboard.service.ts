import { User } from '../models/User';
import { SkinProfile } from '../models/SkinProfile';
import { SkinProgress } from '../models/SkinProgress';
import { Notification } from '../models/Notification';
import { RoutineService } from './routine.service';
import { ApiError } from '../utils/apiError';

export class DashboardService {
  static async getDashboardData(userId: string) {
    // 1. Fetch user (safe JSON projection)
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // 2. Fetch skin profile
    const skinProfile = await SkinProfile.findOne({ userId });

    // 3. Fetch today routines with status
    const todayRoutineData = await RoutineService.getTodayRoutines(userId);

    // 4. Fetch routine completion stats & streak
    const routineStats = await RoutineService.getRoutineStats(userId);

    // 5. Fetch latest skin progress entry
    const latestProgress = await SkinProgress.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // 6. Fetch unread notifications count and latest 3 notifications
    const [unreadCount, recentNotifications] = await Promise.all([
      Notification.countDocuments({ userId, isRead: false }),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        gender: user.gender,
        isPremium: user.isPremium,
      },
      skinProfile: skinProfile
        ? {
            _id: skinProfile._id,
            skinType: skinProfile.skinType,
            concerns: skinProfile.concerns,
            lifestyle: skinProfile.lifestyle,
          }
        : null,
      todayRoutine: todayRoutineData.routines,
      routineCompletion: {
        todayPercentage: routineStats.today.percentage,
        completedStepsToday: routineStats.today.completedSteps,
        totalStepsToday: routineStats.today.totalSteps,
        streakDays: routineStats.streakDays,
      },
      latestProgress: latestProgress
        ? {
            _id: latestProgress._id,
            images: latestProgress.images,
            notes: latestProgress.notes,
            createdAt: latestProgress.createdAt,
          }
        : null,
      unreadNotifications: {
        count: unreadCount,
        recent: recentNotifications,
      },
    };
  }
}
