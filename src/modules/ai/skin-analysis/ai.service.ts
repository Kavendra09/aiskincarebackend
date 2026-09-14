import crypto from 'crypto';
import Groq from 'groq-sdk';
import { ENV } from '../../../config/environment';
import { SkinAnalysis, ISkinAnalysisDocument } from '../../../models/SkinAnalysis';
import { SkinProfile } from '../../../models/SkinProfile';
import { uploadToCloudinary } from '../../../config/cloudinary';
import { ApiError } from '../../../utils/apiError';
import { logger } from '../../../utils/logger';
import { buildSkinAnalysisPrompt, PROMPT_VERSION } from './ai.prompt';
import { AISkinAnalysisValidator } from './ai.validator';
import { SkinScoreService } from '../../skinScore/skinScore.service';
import {
  IStartAnalysisDTO,
  IUploadedPhotoInput,
  IUserProfileContext,
} from './ai.types';

export class AISkinAnalysisService {
  private static groqClient: Groq | null = null;

  private static getClient(): Groq {
    if (!this.groqClient) {
      if (!ENV.GROQ_API_KEY && ENV.NODE_ENV !== 'test') {
        logger.warn('[AISkinAnalysisService] GROQ_API_KEY is not configured');
      }
      this.groqClient = new Groq({ apiKey: ENV.GROQ_API_KEY });
    }
    return this.groqClient;
  }

  static generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
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

    // Run Cloudinary upload + Groq analysis concurrently
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
      this.callGroqWithRetry(photos, prompt),
    ]);

    const validatedOutput = AISkinAnalysisValidator.validate(rawAiOutput);

    if (validatedOutput.status === 'REJECTED') {
      logger.info(`[AISkinAnalysisService] Rejected for ${userId}: ${validatedOutput.rejectionReason}`);
      return await SkinAnalysis.create({
        userId,
        images: uploadedImages,
        imageHash,
        status: 'rejected',
        rejectionReason: validatedOutput.rejectionReason,
        rejectionMessage: validatedOutput.rejectionMessage,
        analysisVersion: ENV.AI_ANALYSIS_VERSION,
        promptVersion: PROMPT_VERSION,
        model: ENV.GROQ_MODEL,
        processingTime: Date.now() - startTime,
        metadata: profileContext,
      });
    }

    const scoreResult = SkinScoreService.calculateScore({
      observations: validatedOutput.observations,
      concerns: validatedOutput.concerns,
      skinType: validatedOutput.skinType,
    });

    const processingTime = Date.now() - startTime;

    const analysisRecord = await SkinAnalysis.create({
      userId,
      images: uploadedImages,
      imageHash,
      status: 'completed',
      analysisVersion: ENV.AI_ANALYSIS_VERSION,
      promptVersion: PROMPT_VERSION,
      model: ENV.GROQ_MODEL,
      skinType: validatedOutput.skinType,
      concerns: validatedOutput.concerns,
      observations: validatedOutput.observations,
      recommendations: validatedOutput.recommendations || [],
      glowScore: scoreResult.glowScore,
      potentialScore: scoreResult.potentialScore,
      aiSummary: validatedOutput.summary,
      processingTime,
      metadata: profileContext,
    });

    logger.info(`[AISkinAnalysisService] Done for ${userId} in ${processingTime}ms — Glow: ${scoreResult.glowScore}`);
    return analysisRecord;
  }

  static async callGroqWithRetry(photos: IUploadedPhotoInput[], prompt: string): Promise<any> {
    const maxRetries = Math.max(0, Math.min(2, ENV.GROQ_MAX_RETRIES));
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[AISkinAnalysisService] Retry attempt ${attempt}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        return await this.callGroqSingleAttempt(photos, prompt);
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

  static async callGroqSingleAttempt(photos: IUploadedPhotoInput[], prompt: string): Promise<any> {
    const client = this.getClient();
    const timeoutMs = ENV.GROQ_TIMEOUT_MS;
    const abortController = new AbortController();
    const timer = setTimeout(() => {
      logger.warn(`[AISkinAnalysisService] AbortSignal fired after ${timeoutMs}ms`);
      abortController.abort();
    }, timeoutMs);

    const requestStart = Date.now();

    try {
      const contentParts: any[] = [{ type: 'text', text: prompt }];

      for (const photo of photos) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`,
          },
        });
      }

      logger.info(`[AISkinAnalysisService] Calling Groq ${ENV.GROQ_MODEL} (timeout: ${timeoutMs}ms)`);

      const completion = await client.chat.completions.create(
        {
          model: ENV.GROQ_MODEL,
          messages: [
            {
              role: 'user',
              content: contentParts,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        },
        {
          signal: abortController.signal,
          timeout: timeoutMs,
        }
      );

      clearTimeout(timer);
      logger.info(`[AISkinAnalysisService] Groq responded in ${Date.now() - requestStart}ms`);

      const responseText = completion?.choices?.[0]?.message?.content;
      if (!responseText) throw ApiError.aiResponseInvalid('Empty response from Groq');

      let cleaned = responseText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      try {
        return JSON.parse(cleaned);
      } catch {
        logger.error('[AISkinAnalysisService] JSON parse failed', { preview: responseText?.substring(0, 300) });
        throw ApiError.aiResponseInvalid('Groq returned non-JSON output');
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

  // Backwards compatibility aliases
  static callGeminiSingleAttempt = (photos: IUploadedPhotoInput[], prompt: string) =>
    AISkinAnalysisService.callGroqSingleAttempt(photos, prompt);

  static callGeminiWithRetry = (photos: IUploadedPhotoInput[], prompt: string) =>
    AISkinAnalysisService.callGroqWithRetry(photos, prompt);

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
