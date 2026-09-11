import { SkinProgress, IProgressImage } from '../models/SkinProgress';
import { ApiError } from '../utils/apiError';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export interface IUploadProgressPhotosDTO {
  frontFile?: Express.Multer.File;
  leftFile?: Express.Multer.File;
  rightFile?: Express.Multer.File;
  notes?: string;
}

export class SkinProgressService {
  static async createProgress(userId: string, dto: IUploadProgressPhotosDTO) {
    if (!dto.frontFile) {
      throw ApiError.badRequest('Front photo is required for skin progress entry');
    }

    const timestamp = Date.now();

    // Upload front image
    const frontResult = await uploadToCloudinary(
      dto.frontFile.buffer,
      `aiskincare/progress/${userId}`,
      `progress_${timestamp}_front`
    );

    const images: {
      front: IProgressImage;
      left?: IProgressImage;
      right?: IProgressImage;
    } = {
      front: {
        url: frontResult.url,
        publicId: frontResult.publicId,
      },
    };

    // Upload optional left image
    if (dto.leftFile) {
      const leftResult = await uploadToCloudinary(
        dto.leftFile.buffer,
        `aiskincare/progress/${userId}`,
        `progress_${timestamp}_left`
      );
      images.left = {
        url: leftResult.url,
        publicId: leftResult.publicId,
      };
    }

    // Upload optional right image
    if (dto.rightFile) {
      const rightResult = await uploadToCloudinary(
        dto.rightFile.buffer,
        `aiskincare/progress/${userId}`,
        `progress_${timestamp}_right`
      );
      images.right = {
        url: rightResult.url,
        publicId: rightResult.publicId,
      };
    }

    const progress = await SkinProgress.create({
      userId,
      images,
      notes: dto.notes?.trim(),
    });

    return progress;
  }

  static async getProgressHistory(userId: string, page: number = 1, limit: number = 10) {
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.min(50, Math.max(1, limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [entries, total] = await Promise.all([
      SkinProgress.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      SkinProgress.countDocuments({ userId }),
    ]);

    return {
      entries,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber) || 1,
      },
    };
  }

  static async getProgressById(userId: string, progressId: string) {
    const progress = await SkinProgress.findById(progressId);
    if (!progress) {
      throw ApiError.notFound('Skin progress record not found');
    }

    if (progress.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have access to this progress record');
    }

    return progress;
  }

  static async deleteProgress(userId: string, progressId: string) {
    const progress = await SkinProgress.findById(progressId);
    if (!progress) {
      throw ApiError.notFound('Skin progress record not found');
    }

    if (progress.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have access to this progress record');
    }

    // Delete associated images from Cloudinary
    if (progress.images.front?.publicId) {
      await deleteFromCloudinary(progress.images.front.publicId);
    }
    if (progress.images.left?.publicId) {
      await deleteFromCloudinary(progress.images.left.publicId);
    }
    if (progress.images.right?.publicId) {
      await deleteFromCloudinary(progress.images.right.publicId);
    }

    await SkinProgress.findByIdAndDelete(progressId);

    return { success: true };
  }
}
