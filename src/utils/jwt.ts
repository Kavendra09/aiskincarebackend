import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/environment';

export interface ITokenPayload {
  userId: string;
  email: string;
}

export const generateTokens = (userId: string, email: string) => {
  const payload: ITokenPayload = { userId, email };

  const accessOptions: SignOptions = {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
  };

  const refreshOptions: SignOptions = {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
  };

  const accessToken = jwt.sign(payload, ENV.JWT_ACCESS_SECRET, accessOptions);
  const refreshToken = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, refreshOptions);

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as ITokenPayload;
};
