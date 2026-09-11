import { SkinProfile, ISkinProfile, SkinType, SkinConcern, ILifestyle } from '../models/SkinProfile';
import { ApiError } from '../utils/apiError';

export interface ICreateSkinProfileDTO {
  skinType: SkinType;
  concerns?: SkinConcern[];
  lifestyle?: ILifestyle;
}

export interface IUpdateSkinProfileDTO {
  skinType?: SkinType;
  concerns?: SkinConcern[];
  lifestyle?: ILifestyle;
}

export class SkinProfileService {
  static async getProfileByUserId(userId: string) {
    const profile = await SkinProfile.findOne({ userId });
    return profile;
  }

  static async createProfile(userId: string, dto: ICreateSkinProfileDTO) {
    const existing = await SkinProfile.findOne({ userId });
    if (existing) {
      throw ApiError.conflict(
        'A skin profile already exists for this user. Use PUT /api/v1/skin-profile to update it.'
      );
    }

    const profile = await SkinProfile.create({
      userId,
      skinType: dto.skinType,
      concerns: dto.concerns || [],
      lifestyle: dto.lifestyle || {},
    });

    return profile;
  }

  static async updateProfile(userId: string, dto: IUpdateSkinProfileDTO) {
    let profile = await SkinProfile.findOne({ userId });

    if (!profile) {
      // If profile doesn't exist yet, create it if skinType is provided
      if (!dto.skinType) {
        throw ApiError.badRequest('Skin profile does not exist yet. Please provide a skinType to create it.');
      }
      profile = await SkinProfile.create({
        userId,
        skinType: dto.skinType,
        concerns: dto.concerns || [],
        lifestyle: dto.lifestyle || {},
      });
      return profile;
    }

    if (dto.skinType) profile.skinType = dto.skinType;
    if (dto.concerns !== undefined) profile.concerns = dto.concerns;
    if (dto.lifestyle) {
      profile.lifestyle = {
        ...profile.lifestyle,
        ...dto.lifestyle,
      };
    }

    await profile.save();
    return profile;
  }

  static async deleteProfile(userId: string) {
    const profile = await SkinProfile.findOneAndDelete({ userId });
    if (!profile) {
      throw ApiError.notFound('Skin profile not found');
    }
    return { success: true };
  }
}
