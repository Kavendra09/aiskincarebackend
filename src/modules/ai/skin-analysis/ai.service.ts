import crypto from 'crypto';
import { GoogleGenAI, createPartFromBase64, createPartFromText } from '@google/genai';
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

export class AISkinAnalysisService {
  private static geminiClient: GoogleGenAI | null = null;

  /**
   * Initializes and caches the official GoogleGenAI client
   */
  private static getClient(): GoogleGenAI {
    if (!this.geminiClient) {
      if (!ENV.GEMINI_API_KEY && ENV.NODE_ENV !== 'test') {
        logger.warn(
          '[AISkinAnalysisService] GEMINI_API_KEY is not configured in environment variables'
        );
      }
      this.geminiClient = new GoogleGenAI({
        apiKey: ENV.GEMINI_API_KEY,
        httpOptions: {
          timeout: ENV.GEMINI_TIMEOUT_MS,
        },
      });
    }
    return this.geminiClient;
  }

  /**
   * Generates SHA-256 hash from image buffer for deduplication and cost control
   */
  static generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Main entry point: Performs complete skin analysis workflow
   */
  static async analyzeSkin(dto: IStartAnalysisDTO): Promise<ISkinAnalysisDocument> {
    const startTime = Date.now();
    const { userId, photos } = dto;

    if (!photos || photos.length === 0) {
      throw ApiError.imageInvalid('At least one facial photo is required for skin analysis');
    }

    // Front photo is primary and required
    const primaryPhoto = photos.find((p) => p.angle === 'front') || photos[0];
    const imageHash = this.generateImageHash(primaryPhoto.buffer);

    // 1. Cost Control / Duplicate Cache Check
    if (ENV.AI_CACHE_DUPLICATES) {
      const existing = await SkinAnalysis.findOne({
        userId,
        imageHash,
        status: 'completed',
      }).sort({ createdAt: -1 });

      if (existing) {
        logger.info(
          `[AISkinAnalysisService] Cache hit for user ${userId} with image hash ${imageHash.substring(0, 8)}...`
        );
        return existing;
      }
    }

    // 2. Fetch User Profile Context (for non-overwriting context guidance)
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
      logger.warn(`[AISkinAnalysisService] Failed to load skin profile context: ${err.message}`);
    }

    // 3. Upload images to Cloudinary
    const timestamp = Date.now();
    const uploadedImages = await Promise.all(
      photos.map(async (photo) => {
        const result = await uploadToCloudinary(
          photo.buffer,
          `aiskincare/ai-analysis/${userId}`,
          `analysis_${timestamp}_${photo.angle}`
        );
        return {
          url: result.url,
          publicId: result.publicId,
          angle: photo.angle,
        };
      })
    );

    // 4. Invoke Gemini with Timeout & Retries
    const prompt = buildSkinAnalysisPrompt(profileContext);
    const rawAiOutput = await this.callGeminiWithRetry(photos, prompt);

    // 5. Server-Side Output Validation
    const validatedOutput = AISkinAnalysisValidator.validate(rawAiOutput);

    // 6. Handle Rejection (Unsuitable Image Quality)
    if (validatedOutput.status === 'REJECTED') {
      logger.info(
        `[AISkinAnalysisService] Image rejected for user ${userId}: ${validatedOutput.rejectionReason}`
      );

      const rejectedRecord = await SkinAnalysis.create({
        userId,
        images: uploadedImages,
        imageHash,
        status: 'rejected',
        rejectionReason: validatedOutput.rejectionReason,
        rejectionMessage: validatedOutput.rejectionMessage,
        analysisVersion: ENV.AI_ANALYSIS_VERSION,
        promptVersion: PROMPT_VERSION,
        model: ENV.GEMINI_MODEL,
        processingTime: Date.now() - startTime,
        metadata: profileContext,
      });

      return rejectedRecord;
    }

    // 7. Deterministic Glow Score Calculation (Backend Business Logic)
    const scoreResult = SkinScoreService.calculateScore({
      observations: validatedOutput.observations,
      concerns: validatedOutput.concerns,
      skinType: validatedOutput.skinType,
    });

    const processingTime = Date.now() - startTime;

    // 8. Persist Completed Analysis in MongoDB
    const analysisRecord = await SkinAnalysis.create({
      userId,
      images: uploadedImages,
      imageHash,
      status: 'completed',
      analysisVersion: ENV.AI_ANALYSIS_VERSION,
      promptVersion: PROMPT_VERSION,
      model: ENV.GEMINI_MODEL,
      skinType: validatedOutput.skinType,
      concerns: validatedOutput.concerns,
      observations: validatedOutput.observations,
      glowScore: scoreResult.glowScore,
      potentialScore: scoreResult.potentialScore,
      aiSummary: validatedOutput.summary,
      processingTime,
      metadata: profileContext,
    });

    logger.info(
      `[AISkinAnalysisService] Analysis completed for user ${userId} in ${processingTime}ms with Glow Score ${scoreResult.glowScore}`
    );

    return analysisRecord;
  }

  /**
   * Executes Gemini API call with exponential backoff and timeout enforcement
   */
  private static async callGeminiWithRetry(
    photos: IUploadedPhotoInput[],
    prompt: string
  ): Promise<any> {
    const maxRetries = Math.max(0, Math.min(2, ENV.GEMINI_MAX_RETRIES));
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          logger.info(`[AISkinAnalysisService] Retry attempt ${attempt} after ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return await this.callGeminiSingleAttempt(photos, prompt);
      } catch (err: any) {
        lastError = err;

        // If it's a timeout or abort, fail immediately - do NOT retry hanging/timed out requests
        if (
          (err instanceof ApiError && err.errorCode === 'AI_TIMEOUT') ||
          err.name === 'AbortError' ||
          err.message?.includes('aborted')
        ) {
          lastError = ApiError.aiTimeout(`Gemini API call timed out after ${ENV.GEMINI_TIMEOUT_MS}ms`);
          break;
        }

        // Check if error is client validation, auth, or model not found
        const statusCode = err?.status || err?.statusCode || 500;
        if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404) {
          logger.error(`[AISkinAnalysisService] Permanent API error (${statusCode}): ${err.message}`);
          throw ApiError.aiProviderError(`AI service error (${statusCode}): ${err.message || 'Request invalid or model not found'}`);
        }

        logger.warn(
          `[AISkinAnalysisService] Transient error on attempt ${attempt + 1}: ${err.message}`
        );
      }
    }

    logger.error('[AISkinAnalysisService] All Gemini retry attempts exhausted', {
      message: lastError?.message,
    });

    if (lastError instanceof ApiError) {
      throw lastError;
    }

    throw ApiError.aiProviderError('AI provider is currently unavailable, please try again');
  }

  /**
   * Single attempt execution to Google Gemini API with genuine AbortSignal cancellation
   */
  private static async callGeminiSingleAttempt(
    photos: IUploadedPhotoInput[],
    prompt: string
  ): Promise<any> {
    const client = this.getClient();

    // Prepare contents: Text instructions + image parts
    const parts: any[] = [createPartFromText(prompt)];

    for (const photo of photos) {
      const base64Data = photo.buffer.toString('base64');
      parts.push(createPartFromBase64(base64Data, photo.mimetype));
    }

    const timeoutMs = ENV.GEMINI_TIMEOUT_MS;
    const abortController = new AbortController();
    const timer = setTimeout(() => {
      logger.warn(`[AISkinAnalysisService] Timeout reached (${timeoutMs}ms), aborting active Gemini request.`);
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await client.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: geminiSkinAnalysisSchema,
          abortSignal: abortController.signal,
          httpOptions: {
            timeout: timeoutMs,
          },
        },
      });

      clearTimeout(timer);

      const responseText = response?.text;
      if (!responseText) {
        throw ApiError.aiResponseInvalid('Empty response received from Gemini');
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError: any) {
        logger.error('[AISkinAnalysisService] Failed to parse JSON from Gemini response:', {
          text: responseText,
        });
        throw ApiError.aiResponseInvalid('Gemini output could not be parsed as valid JSON');
      }
    } catch (err: any) {
      clearTimeout(timer);

      if (
        abortController.signal.aborted ||
        err.name === 'AbortError' ||
        err.message?.includes('aborted') ||
        err.message?.includes('timeout')
      ) {
        throw ApiError.aiTimeout(`Gemini API call timed out after ${timeoutMs}ms`);
      }

      throw err;
    }
  }

  /**
   * Retrieves single analysis by ID with user ownership check
   */
  static async getAnalysisById(userId: string, analysisId: string): Promise<ISkinAnalysisDocument> {
    const analysis = await SkinAnalysis.findById(analysisId);
    if (!analysis) {
      throw ApiError.analysisNotFound('Skin analysis record not found');
    }

    if (analysis.userId.toString() !== userId) {
      throw ApiError.unauthorizedAnalysisAccess(
        'You do not have permission to view this skin analysis'
      );
    }

    return analysis;
  }

  /**
   * Retrieves user's analysis history with pagination, newest first
   */
  static async getAnalysisHistory(userId: string, page: number = 1, limit: number = 10) {
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.min(50, Math.max(1, limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [entries, total] = await Promise.all([
      SkinAnalysis.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      SkinAnalysis.countDocuments({ userId }),
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
}
