import { Types } from 'mongoose';
import { Routine, IRoutine, IRoutineStep, RoutineStepCategory } from '../models/Routine';
import { RoutineCompletion } from '../models/RoutineCompletion';
import { ApiError } from '../utils/apiError';

export interface ICreateRoutineDTO {
  name: string;
  type: 'morning' | 'night' | 'custom';
  description?: string;
  steps?: {
    title: string;
    description?: string;
    category?: RoutineStepCategory;
    order?: number;
  }[];
}

export interface IUpdateRoutineDTO {
  name?: string;
  type?: 'morning' | 'night' | 'custom';
  description?: string;
  isActive?: boolean;
}

export interface IStepDTO {
  title: string;
  description?: string;
  category?: RoutineStepCategory;
  order?: number;
  isActive?: boolean;
}

export const getFormattedDate = (d: Date = new Date()): string => {
  return d.toISOString().split('T')[0];
};

export class RoutineService {
  static async getUserRoutines(userId: string) {
    return await Routine.find({ userId }).sort({ type: 1, createdAt: 1 });
  }

  static async getRoutineById(userId: string, routineId: string) {
    const routine = await Routine.findById(routineId);
    if (!routine) {
      throw ApiError.notFound('Routine not found');
    }
    if (routine.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have access to this routine');
    }
    return routine;
  }

  static async createRoutine(userId: string, dto: ICreateRoutineDTO) {
    const steps = (dto.steps || []).map((s, index) => ({
      title: s.title,
      description: s.description || '',
      category: s.category || 'other',
      order: s.order !== undefined ? s.order : index + 1,
      isActive: true,
    }));

    const routine = await Routine.create({
      userId,
      name: dto.name,
      type: dto.type,
      description: dto.description || '',
      steps,
      isActive: true,
    });

    return routine;
  }

  static async updateRoutine(userId: string, routineId: string, dto: IUpdateRoutineDTO) {
    const routine = await this.getRoutineById(userId, routineId);

    if (dto.name !== undefined) routine.name = dto.name;
    if (dto.type !== undefined) routine.type = dto.type;
    if (dto.description !== undefined) routine.description = dto.description;
    if (dto.isActive !== undefined) routine.isActive = dto.isActive;

    await routine.save();
    return routine;
  }

  static async deleteRoutine(userId: string, routineId: string) {
    await this.getRoutineById(userId, routineId);
    await Routine.findByIdAndDelete(routineId);
    // Cleanup associated completions
    await RoutineCompletion.deleteMany({ routineId });
    return { success: true };
  }

  static async addStep(userId: string, routineId: string, stepDto: IStepDTO) {
    const routine = await this.getRoutineById(userId, routineId);
    const newOrder =
      stepDto.order !== undefined ? stepDto.order : routine.steps.length + 1;

    routine.steps.push({
      title: stepDto.title,
      description: stepDto.description || '',
      category: stepDto.category || 'other',
      order: newOrder,
      isActive: stepDto.isActive !== undefined ? stepDto.isActive : true,
    } as IRoutineStep);

    await routine.save();
    return routine;
  }

  static async updateStep(
    userId: string,
    routineId: string,
    stepId: string,
    stepDto: Partial<IStepDTO>
  ) {
    const routine = await this.getRoutineById(userId, routineId);
    const step = routine.steps.find((s) => s._id?.toString() === stepId);

    if (!step) {
      throw ApiError.notFound('Routine step not found');
    }

    if (stepDto.title !== undefined) step.title = stepDto.title;
    if (stepDto.description !== undefined) step.description = stepDto.description;
    if (stepDto.category !== undefined) step.category = stepDto.category;
    if (stepDto.order !== undefined) step.order = stepDto.order;
    if (stepDto.isActive !== undefined) step.isActive = stepDto.isActive;

    await routine.save();
    return routine;
  }

  static async deleteStep(userId: string, routineId: string, stepId: string) {
    const routine = await this.getRoutineById(userId, routineId);
    const initialLength = routine.steps.length;
    routine.steps = routine.steps.filter((s) => s._id?.toString() !== stepId);

    if (routine.steps.length === initialLength) {
      throw ApiError.notFound('Routine step not found');
    }

    await routine.save();
    await RoutineCompletion.deleteMany({ stepId: new Types.ObjectId(stepId) });
    return routine;
  }

  static async toggleStepCompletion(
    userId: string,
    routineId: string,
    stepId: string,
    targetDate?: string
  ) {
    const routine = await this.getRoutineById(userId, routineId);
    const step = routine.steps.find((s) => s._id?.toString() === stepId);

    if (!step) {
      throw ApiError.notFound('Routine step not found');
    }

    const date = targetDate || getFormattedDate();

    // Check if already completed
    const existing = await RoutineCompletion.findOne({
      userId,
      routineId,
      stepId,
      date,
    });

    if (existing) {
      // Toggle off / remove completion
      await RoutineCompletion.findByIdAndDelete(existing._id);
      return {
        completed: false,
        date,
        stepId,
        routineId,
      };
    } else {
      // Mark completed
      const completion = await RoutineCompletion.create({
        userId,
        routineId,
        stepId,
        date,
        completedAt: new Date(),
      });
      return {
        completed: true,
        date,
        stepId,
        routineId,
        completedAt: completion.completedAt,
      };
    }
  }

  static async getTodayRoutines(userId: string) {
    const today = getFormattedDate();
    const routines = await Routine.find({ userId, isActive: true });

    // Fetch all completions for today
    const completions = await RoutineCompletion.find({
      userId,
      date: today,
    });

    const completedStepIdSet = new Set(
      completions.map((c) => c.stepId.toString())
    );

    const routinesWithStatus = routines.map((r) => {
      const activeSteps = r.steps.filter((s) => s.isActive);
      const stepsWithStatus = activeSteps.map((step) => ({
        ...((step as any).toObject ? (step as any).toObject() : step),
        isCompleted: completedStepIdSet.has(step._id!.toString()),
      }));

      const completedCount = stepsWithStatus.filter((s) => s.isCompleted).length;
      const totalCount = stepsWithStatus.length;
      const completionPercentage =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        _id: r._id,
        name: r.name,
        type: r.type,
        description: r.description,
        totalSteps: totalCount,
        completedSteps: completedCount,
        completionPercentage,
        steps: stepsWithStatus,
      };
    });

    return {
      date: today,
      routines: routinesWithStatus,
    };
  }

  static async getRoutineStats(userId: string) {
    const today = getFormattedDate();

    // 1. Today's status
    const todayRoutines = await this.getTodayRoutines(userId);
    let totalStepsToday = 0;
    let completedStepsToday = 0;

    for (const r of todayRoutines.routines) {
      totalStepsToday += r.totalSteps;
      completedStepsToday += r.completedSteps;
    }

    const todayPercentage =
      totalStepsToday > 0
        ? Math.round((completedStepsToday / totalStepsToday) * 100)
        : 0;

    // 2. Weekly completion (past 7 days)
    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      past7Days.push(getFormattedDate(d));
    }

    const weeklyCompletions = await RoutineCompletion.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $in: past7Days },
        },
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
        },
      },
    ]);

    const weeklyMap = new Map<string, number>();
    weeklyCompletions.forEach((item) => weeklyMap.set(item._id, item.count));

    const weeklyProgress = past7Days.map((date) => ({
      date,
      completedSteps: weeklyMap.get(date) || 0,
    }));

    // 3. Current streak calculation
    // A streak continues if consecutive prior days had at least 1 completed step
    const allCompletionDates = await RoutineCompletion.distinct('date', {
      userId,
    });
    const dateSet = new Set(allCompletionDates.map(String));

    let streak = 0;
    let checkDate = new Date();

    // If completed something today, start count from today, otherwise check yesterday
    const todayStr = getFormattedDate(checkDate);
    if (dateSet.has(todayStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Check if streak was active yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateSet.has(getFormattedDate(yesterday))) {
        checkDate = yesterday;
      }
    }

    while (dateSet.has(getFormattedDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // 4. Monthly completions
    const currentMonth = today.substring(0, 7); // 'YYYY-MM'
    const monthlyCompletionsCount = await RoutineCompletion.countDocuments({
      userId,
      date: { $regex: `^${currentMonth}` },
    });

    return {
      today: {
        date: today,
        percentage: todayPercentage,
        completedSteps: completedStepsToday,
        totalSteps: totalStepsToday,
      },
      streakDays: streak,
      weeklyProgress,
      monthlyCompletionsCount,
    };
  }
}
