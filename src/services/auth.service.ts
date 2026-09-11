import crypto from 'crypto';
import { User, IUserDocument } from '../models/User';
import { ApiError } from '../utils/apiError';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

export interface IRegisterDTO {
  name: string;
  email: string;
  password?: string;
  gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say' | 'other';
  dateOfBirth?: Date;
  age?: number;
}

export interface ILoginDTO {
  email: string;
  password?: string;
}

export class AuthService {
  static async register(dto: IRegisterDTO) {
    const existingUser = await User.findOne({ email: dto.email.toLowerCase().trim() });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const user = new User({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: dto.password,
      gender: dto.gender || 'prefer-not-to-say',
      dateOfBirth: dto.dateOfBirth,
      age: dto.age,
    });

    const tokens = generateTokens(user._id.toString(), user.email);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  static async login(dto: ILoginDTO) {
    const user = await User.findOne({
      email: dto.email.toLowerCase().trim(),
    }).select('+password +refreshToken');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated');
    }

    const isMatch = await user.comparePassword(dto.password || '');
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = generateTokens(user._id.toString(), user.email);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  static async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    let decoded: any;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User session not found or deactivated');
    }

    if (user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Refresh token is invalid or has been revoked');
    }

    const tokens = generateTokens(user._id.toString(), user.email);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  static async logout(userId: string) {
    const user = await User.findById(userId).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return { success: true };
  }

  static async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return safe message to prevent email enumeration
      return {
        message: 'If an account exists with that email, a password reset token has been generated',
        resetToken: null,
      };
    }

    // Generate random unhashed token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and store in user document
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await user.save({ validateBeforeSave: false });

    return {
      message: 'Password reset token generated successfully',
      resetToken, // Returned in API response for now without needing email provider
    };
  }

  static async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw ApiError.badRequest('Reset token and new password are required');
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters long');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshToken = undefined; // Force re-login on all devices

    await user.save();

    return { message: 'Password has been reset successfully' };
  }
}
