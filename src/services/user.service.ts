import { User } from '../models/User';
import { ApiError } from '../utils/apiError';
import { uploadToCloudinary } from '../config/cloudinary';

export class UserService {
  static async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  static async updateProfile(
    userId: string,
    updateData: {
      name?: string;
      gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say' | 'other';
      dateOfBirth?: Date;
      age?: number;
    }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (updateData.name !== undefined) user.name = updateData.name.trim();
    if (updateData.gender !== undefined) user.gender = updateData.gender;
    if (updateData.dateOfBirth !== undefined) user.dateOfBirth = updateData.dateOfBirth;
    if (updateData.age !== undefined) user.age = updateData.age;

    await user.save();
    return user;
  }

  static async updateAvatar(userId: string, fileBuffer: Buffer) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const uploadResult = await uploadToCloudinary(
      fileBuffer,
      'aiskincare/avatars',
      `user_${userId}_avatar`
    );

    user.profileImage = uploadResult.url;
    await user.save();

    return {
      profileImage: user.profileImage,
    };
  }
}
