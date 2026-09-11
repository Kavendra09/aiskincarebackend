import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { ENV } from './environment';
import { logger } from '../utils/logger';

// Configure Cloudinary
if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface ICloudinaryUploadResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'aiskincare/general',
  filename?: string
): Promise<ICloudinaryUploadResult> => {
  // If Cloudinary is not configured or in test environment, gracefully fallback to mock URL
  if (
    process.env.NODE_ENV === 'test' ||
    ENV.NODE_ENV === 'test' ||
    !ENV.CLOUDINARY_CLOUD_NAME ||
    ENV.CLOUDINARY_CLOUD_NAME === 'mock_cloud' ||
    !ENV.CLOUDINARY_API_KEY ||
    ENV.CLOUDINARY_API_KEY === 'mock_key'
  ) {
    const mockId = `${folder.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    logger.info(`[Cloudinary Mock] Saved buffer to mock image: ${mockId}`);
    return {
      url: `https://res.cloudinary.com/demo/image/upload/${mockId}.webp`,
      publicId: mockId,
    };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'image',
        format: 'webp', // Auto-optimize to modern webp format
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          logger.error('Cloudinary upload error:', error);
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (
    process.env.NODE_ENV === 'test' ||
    ENV.NODE_ENV === 'test' ||
    !ENV.CLOUDINARY_CLOUD_NAME ||
    ENV.CLOUDINARY_CLOUD_NAME === 'mock_cloud' ||
    !ENV.CLOUDINARY_API_KEY
  ) {
    logger.info(`[Cloudinary Mock] Deleted image: ${publicId}`);
    return true;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error: any) {
    logger.error(`Cloudinary deletion error for ${publicId}:`, error);
    return false;
  }
};

export default cloudinary;
