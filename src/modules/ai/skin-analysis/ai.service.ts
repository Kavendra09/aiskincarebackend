import crypto from 'crypto';
import { GoogleGenAI, createPartFromUri, createPartFromBase64, createPartFromText } from '@google/genai';
import { ENV } from '../../../config/environment';
import { SkinAnalysis, ISkinAnalysisDocument } from '../../../models/SkinAnalysis';
import { SkinProfile } from '../../../models/SkinProfile';
import { uploadToCloudinary } from '../../../config/cloudinary';
import { ApiError } from '../../../utils/apiError';
import { logger } from '../../../utils/logger';
import { buildSkinAnalysisPrompt, PROMPT_VERSION } from './ai.prompt';
import { geminiSkinAnalysisSchema } from './ai.schema';
import { AISkinAnalysisValidator } from './ai.validator';
import { SkinScoreService } from '../../skinScore/skinScore.service';
import {
  IStartAnalysisDTO,
  IUploadedPhotoInput,
  IUserProfileContext,
  IValidatedAIOutput,
} from './ai.types';

// Images up to 10MB use fast inline base64 directly (eliminates Files API network hop)
const INLINE_SIZE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB

export class AISkinAnalysisService {
  private static geminiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI {
    if (!this.geminiClient) {
      if (!ENV.GEMINI_API_KEY && ENV.NODE_ENV !== 'test') {
        logger.warn('[AISkinAnalysisService] GEMINI_API_KEY is not configured');
      }
      this.geminiClient = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
    }
    return this.geminiClient;
  }

  static generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private static async uploadToGeminiFilesAPI(
    photo: IUploadedPhotoInput
  ): Promise<{ uri: string; mimeType: string }> {
    const client = this.getClient();
    const sizeMB = (photo.buffer.length / (1024 * 1024)).toFixed(2);
    logger.info(`[AISkinAnalysisService] Uploading ${photo.angle} (${sizeMB}MB) to Gemini Files API`);
    const blob = new Blob([photo.buffer], { type: photo.mimetype });
    const result = await client.files.upload({
      file: blob,
      config: { mimeType: photo.mimetype, displayName: `glowmaxx_${photo.angle}_${Date.now()}` },
    });
    if (!result.uri) throw new Error('Gemini Files API did not return a file URI');
    logger.info(`[AISkinAnalysisService] Files API upload done: ${result.uri}`);
    return { uri: result.uri, mimeType: photo.mimetype };
  }

  static async analyzeSkin(dto: IStartAnalysisDTO): Promise<ISkinAnalysisDocument> {
    const startTime = Date.now();
    const { userId, photos } = dto;

    if (!photos || photos.length === 0) {
      throw ApiError.imageInvalid('At least one facial photo is required');
    }

    const primaryPhoto = photos.find((p) => p.angle === 'front') || photos[0];
    const imageHash = this.generateImageHash(primaryPhoto.buffer);

    if (ENV.AI_CACHE_DUPLICATES) {
      const existing = await SkinAnalysis.findOne({ userId, imageHash, status: 'completed' }).sort({ createdAt: -1 });
      if (existing) {
        logger.info(`[AISkinAnalysisService] Cache hit for ${userId} hash ${imageHash.substring(0, 8)}...`);
        return existing;
      }
    }

    let profileContext: IUserProfileContext = dto.userContext || {};
    try {
      const userProfile = await SkinProfile.findOne({ userId });
      if (userProfile) {
        profileContext = {
          ...profileContext,
          userDeclaredSkinType: userProfile.skinType,
          userDeclaredConcerns: userProfile.concerns,
          lifestyle: userProfile.lifestyle,
        };
      }
    } catch (err: any) {
      logger.warn(`[AISkinAnalysisService] Could not load skin profile: ${err.message}`);
    }

    const prompt = buildSkinAnalysisPrompt(profileContext);

    // Run Cloudinary upload + Gemini analysis concurrently
    const [uploadedImages, rawAiOutput] = await Promise.all([
      Promise.all(
        photos.map(async (photo) => {
          const result = await uploadToCloudinary(
            photo.buffer,
            `aiskincare/ai-analysis/${userId}`,
            `analysis_${Date.now()}_${photo.angle}`
          );
          return { url: result.url, publicId: result.publicId, angle: photo.angle };
        })
      ),
      this.callGeminiWithRetry(photos, prompt),
    ]);

    const validatedOutput = AISkinAnalysisValidator.validate(rawAiOutput);

    if (validatedOutput.status === 'REJECTED') {
      logger.info(`[AISkinAnalysisService] Rejected for ${userId}: ${validatedOutput.rejectionReason}`);
      return await SkinAnalysis.create({
        userId, images: uploadedImages, imageHash, status: 'rejected',
        rejectionReason: validatedOutput.rejectionReason,
        rejectionMessage: validatedOutput.rejectionMessage,
        analysisVersion: ENV.AI_ANALYSIS_VERSION, promptVersion: PROMPT_VERSION,
        model: ENV.GEMINI_MODEL, processingTime: Date.now() - startTime, metadata: profileContext,
      });
    }

    const scoreResult = SkinScoreService.calculateScore({
      observations: validatedOutput.observations,
      concerns: validatedOutput.concerns,
      skinType: validatedOutput.skinType,
    });

    const processingTime = Date.now() - startTime;

    const analysisRecord = await SkinAnalysis.create({
      userId, images: uploadedImages, imageHash, status: 'completed',
      analysisVersion: ENV.AI_ANALYSIS_VERSION, promptVersion: PROMPT_VERSION,
      model: ENV.GEMINI_MODEL,
      skinType: validatedOutput.skinType, concerns: validatedOutput.concerns,
      observations: validatedOutput.observations,
      glowScore: scoreResult.glowScore, potentialScore: scoreResult.potentialScore,
      aiSummary: validatedOutput.summary, processingTime, metadata: profileContext,
    });

    logger.info(`[AISkinAnalysisService] Done for ${userId} in ${processingTime}ms — Glow: ${scoreResult.glowScore}`);
    return analysisRecord;
  }

  private static async callGeminiWithRetry(photos: IUploadedPhotoInput[], prompt: string): Promise<any> {
    const maxRetries = Math.max(0, Math.min(1, ENV.GEMINI_MAX_RETRIES));
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[AISkinAnalysisService] Retry attempt ${attempt}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        return await this.callGeminiSingleAttempt(photos, prompt);
      } catch (err: any) {
        lastError = err;

        if (err instanceof ApiError && (err.errorCode === 'AI_TIMEOUT' || err.errorCode === 'AI_RESPONSE_INVALID')) {
          break;
        }

        const statusCode = err?.status || err?.statusCode || 500;
        if ([400, 401, 403, 404].includes(statusCode)) {
          logger.error(`[AISkinAnalysisService] Permanent error (${statusCode}): ${err.message}`);
          throw ApiError.aiProviderError(`AI service error (${statusCode}): ${err.message || 'Invalid request'}`);
        }

        logger.warn(`[AISkinAnalysisService] Transient error attempt ${attempt + 1}: ${err.message}`);
      }
    }

    logger.error('[AISkinAnalysisService] All attempts exhausted', { message: lastError?.message });
    if (lastError instanceof ApiError) throw lastError;
    throw ApiError.aiProviderError('AI provider is unavailable, please try again');
  }

  private static async callGeminiSingleAttempt(photos: IUploadedPhotoInput[], prompt: string): Promise<any> {
    const client = this.getClient();
    const timeoutMs = ENV.GEMINI_TIMEOUT_MS;
    const abortController = new AbortController();
    const timer = setTimeout(() => {
      logger.warn(`[AISkinAnalysisService] AbortSignal fired after ${timeoutMs}ms`);
      abortController.abort();
    }, timeoutMs);

    const requestStart = Date.now();

    try {
      const parts: any[] = [createPartFromText(prompt)];

      for (const photo of photos) {
        const sizeMB = (photo.buffer.length / (1024 * 1024)).toFixed(2);
        if (photo.buffer.length > INLINE_SIZE_THRESHOLD_BYTES) {
          logger.info(`[AISkinAnalysisService] ${photo.angle}: ${sizeMB}MB -> Files API`);
          const { uri, mimeType } = await this.uploadToGeminiFilesAPI(photo);
          parts.push(createPartFromUri(uri, mimeType));
        } else {
          logger.info(`[AISkinAnalysisService] ${photo.angle}: ${sizeMB}MB -> inline base64`);
          parts.push(createPartFromBase64(photo.buffer.toString('base64'), photo.mimetype));
        }
      }

      logger.info(`[AISkinAnalysisService] Calling Gemini ${ENV.GEMINI_MODEL} (timeout: ${timeoutMs}ms)`);

      const response = await client.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: geminiSkinAnalysisSchema,
          abortSignal: abortController.signal,
          httpOptions: { timeout: timeoutMs },
        },
      });

      clearTimeout(timer);
      logger.info(`[AISkinAnalysisService] Gemini responded in ${Date.now() - requestStart}ms`);

      const responseText = response?.text;
      if (!responseText) throw ApiError.aiResponseInvalid('Empty response from Gemini');

      try {
        return JSON.parse(responseText);
      } catch {
        logger.error('[AISkinAnalysisService] JSON parse failed', { preview: responseText?.substring(0, 300) });
        throw ApiError.aiResponseInvalid('Gemini returned non-JSON output');
      }
    } catch (err: any) {
      clearTimeout(timer);
      const elapsedMs = Date.now() - requestStart;

      const isAborted =
        abortController.signal.aborted ||
        err.name === 'AbortError' ||
        err.name === 'TimeoutError' ||
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        (typeof err.message === 'string' &&
          (err.message.toLowerCase().includes('aborted') ||
            err.message.toLowerCase().includes('timed out') ||
            err.message.toLowerCase().includes('timeout')));

      if (isAborted) {
        logger.warn(`[AISkinAnalysisService] Timed out after ${elapsedMs}ms (limit: ${timeoutMs}ms)`);
        throw ApiError.aiTimeout(
          `AI analysis timed out after ${Math.round(elapsedMs / 1000)}s. Please try again with a clearer photo.`
        );
      }

      if (err instanceof ApiError) throw err;
      throw err;
    }
  }

  static async getAnalysisById(userId: string, analysisId: string): Promise<ISkinAnalysisDocument> {
    const analysis = await SkinAnalysis.findById(analysisId);
    if (!analysis) throw ApiError.analysisNotFound('Skin analysis record not found');
    if (analysis.userId.toString() !== userId) {
      throw ApiError.unauthorizedAnalysisAccess('You do not have permission to view this analysis');
    }
    return analysis;
  }

  static async getAnalysisHistory(userId: string, page: number = 1, limit: number = 10) {
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.min(50, Math.max(1, limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [entries, total] = await Promise.all([
      SkinAnalysis.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
      SkinAnalysis.countDocuments({ userId }),
    ]);

    return {
      entries,
      pagination: { page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) || 1 },
    };
  }
}
