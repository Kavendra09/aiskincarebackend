import {
  AI_SKIN_TYPES,
  AI_SKIN_CONCERN_TYPES,
  AI_SEVERITY_LEVELS,
  AISkinTypeValue,
  AISkinConcernType,
  AISeverityLevel,
  IAISkinTypeResult,
  IAISkinConcernResult,
  IAIObservations,
  IAISkinRecommendation,
} from '../../../models/SkinAnalysis';
import { IValidatedAIOutput, IRawGroqResponse } from './ai.types';
import { ApiError } from '../../../utils/apiError';
import { logger } from '../../../utils/logger';
import { ENV } from '../../../config/environment';


export class AISkinAnalysisValidator {
  /**
   * Validates and sanitizes raw JSON returned by the Groq AI model.
   * Ensures all enums, numbers, ranges, and structures adhere to strict business rules.
   */
  static validate(raw: any): IValidatedAIOutput {
    if (!raw || typeof raw !== 'object') {
      logger.error('[AI Validator] AI model output is not a valid JSON object:', raw);
      throw ApiError.aiResponseInvalid('AI provider returned empty or non-object response');
    }

    const validationErrors: string[] = [];

    // 1. Detect REJECTED status (supports both analysisStatus: "rejected" and status: "REJECTED" or imageQuality.isUsable: false)
    const isRejected =
      raw.analysisStatus?.toLowerCase() === 'rejected' ||
      raw.status?.toUpperCase() === 'REJECTED' ||
      (raw.imageQuality && raw.imageQuality.isUsable === false);

    if (isRejected) {
      const rejectionReason =
        (typeof raw.imageQuality?.reason === 'string' && raw.imageQuality.reason.trim()) ||
        (typeof raw.rejectionReason === 'string' && raw.rejectionReason.trim()) ||
        'IMAGE_QUALITY_INSUFFICIENT';

      const rejectionMessage =
        (typeof raw.imageQuality?.reason === 'string' && raw.imageQuality.reason.trim()) ||
        (typeof raw.rejectionMessage === 'string' && raw.rejectionMessage.trim()) ||
        'Please upload a clear, well-lit facial photo.';

      return {
        status: 'REJECTED',
        rejectionReason,
        rejectionMessage,
        analysisVersion: ENV.AI_ANALYSIS_VERSION,
        concerns: [],
        recommendations: [],
      };
    }

    // 2. Validate status if explicitly provided
    const statusVal = raw.analysisStatus || raw.status;
    if (statusVal) {
      const normalizedStatus = String(statusVal).toLowerCase();
      if (normalizedStatus !== 'completed' && normalizedStatus !== 'success') {
        validationErrors.push(
          `Invalid status "${statusVal}". Expected "completed" / "success" or "rejected"`
        );
      }
    }

    // 3. Validate skinType
    let validatedSkinType: IAISkinTypeResult | undefined = undefined;
    if (raw.skinType) {
      const { value, confidence } = raw.skinType;
      if (!AI_SKIN_TYPES.includes(value as AISkinTypeValue)) {
        validationErrors.push(
          `Invalid skinType value "${value}". Allowed: ${AI_SKIN_TYPES.join(', ')}`
        );
      }

      const confNum = Number(confidence);
      if (isNaN(confNum) || confNum < 0 || confNum > 1) {
        validationErrors.push(`Invalid skinType confidence "${confidence}". Must be between 0 and 1`);
      }

      if (validationErrors.length === 0) {
        validatedSkinType = {
          value: value as AISkinTypeValue,
          confidence: Math.round(confNum * 100) / 100,
        };
      }
    }

    // 4. Validate concerns (max 2 as per finalized prompt rules)
    const validatedConcerns: IAISkinConcernResult[] = [];
    if (raw.concerns) {
      if (!Array.isArray(raw.concerns)) {
        validationErrors.push('Field "concerns" must be an array');
      } else {
        const concernItems = raw.concerns.slice(0, 2); // strictly max 2 concerns
        for (let i = 0; i < concernItems.length; i++) {
          const item = concernItems[i];
          if (!item || typeof item !== 'object') {
            validationErrors.push(`Concern at index ${i} is not an object`);
            continue;
          }

          if (!AI_SKIN_CONCERN_TYPES.includes(item.type as AISkinConcernType)) {
            validationErrors.push(
              `Concern at index ${i} has invalid type "${item.type}". Allowed: ${AI_SKIN_CONCERN_TYPES.join(', ')}`
            );
          }

          if (!AI_SEVERITY_LEVELS.includes(item.severity as AISeverityLevel)) {
            validationErrors.push(
              `Concern at index ${i} has invalid severity "${item.severity}". Allowed: ${AI_SEVERITY_LEVELS.join(', ')}`
            );
          }

          const conf = Number(item.confidence);
          if (isNaN(conf) || conf < 0 || conf > 1) {
            validationErrors.push(
              `Concern at index ${i} has invalid confidence "${item.confidence}". Must be between 0 and 1`
            );
          }

          if (
            AI_SKIN_CONCERN_TYPES.includes(item.type as AISkinConcernType) &&
            AI_SEVERITY_LEVELS.includes(item.severity as AISeverityLevel) &&
            !isNaN(conf) &&
            conf >= 0 &&
            conf <= 1
          ) {
            validatedConcerns.push({
              type: item.type as AISkinConcernType,
              severity: item.severity as AISeverityLevel,
              confidence: Math.round(conf * 100) / 100,
            });
          }
        }
      }
    }

    // 5. Validate observations
    const validatedObservations: IAIObservations = {
      oiliness: null,
      dryness: null,
      redness: null,
      visiblePores: null,
      unevenTone: null,
      texture: null,
      darkCircles: null,
    };

    if (raw.observations && typeof raw.observations === 'object') {
      const observationKeys: (keyof IAIObservations)[] = [
        'oiliness',
        'dryness',
        'redness',
        'visiblePores',
        'unevenTone',
        'texture',
        'darkCircles',
      ];

      for (const key of observationKeys) {
        const val = raw.observations[key];
        if (val === null || val === undefined || val === '') {
          validatedObservations[key] = null;
        } else if (typeof val === 'string' && ['none', 'low', 'mild', 'moderate', 'medium', 'high', 'severe'].includes(val.toLowerCase().trim())) {
          const lower = val.toLowerCase().trim();
          if (lower === 'none') validatedObservations[key] = 0;
          else if (lower === 'low' || lower === 'mild') validatedObservations[key] = 30;
          else if (lower === 'moderate' || lower === 'medium') validatedObservations[key] = 60;
          else if (lower === 'high' || lower === 'severe') validatedObservations[key] = 85;
        } else {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 100) {
            validationErrors.push(
              `Observation "${key}" must be null or an integer between 0 and 100 (received: ${val})`
            );
          } else {
            validatedObservations[key] = Math.round(num);
          }
        }
      }
    }

    // 6. Validate recommendations (max 2 as per finalized prompt rules)
    const validatedRecommendations: IAISkinRecommendation[] = [];
    if (raw.recommendations && Array.isArray(raw.recommendations)) {
      const recItems = raw.recommendations.slice(0, 2);
      for (const rec of recItems) {
        if (rec && typeof rec === 'object') {
          validatedRecommendations.push({
            concern: typeof rec.concern === 'string' ? rec.concern.trim() : '',
            productType: typeof rec.productType === 'string' ? rec.productType.trim() : '',
            keyIngredient: typeof rec.keyIngredient === 'string' ? rec.keyIngredient.trim() : '',
            reason: typeof rec.reason === 'string' ? rec.reason.trim() : '',
          });
        }
      }
    }

    // Check for critical validation errors
    if (validationErrors.length > 0) {
      logger.error('[AI Validator] Schema validation failed for AI model response:', {
        errors: validationErrors,
        raw,
      });
      throw ApiError.aiResponseInvalid(
        `AI response validation failed: ${validationErrors.join('; ')}`,
        validationErrors.map((e) => ({ message: e }))
      );
    }

    return {
      status: 'SUCCESS',
      analysisVersion: ENV.AI_ANALYSIS_VERSION,
      skinType: validatedSkinType,
      concerns: validatedConcerns,
      observations: validatedObservations,
      recommendations: validatedRecommendations,
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : undefined,
    };
  }
}
