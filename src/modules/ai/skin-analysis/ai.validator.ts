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
} from '../../../models/SkinAnalysis';
import { IValidatedAIOutput, IRawGeminiResponse } from './ai.types';
import { ApiError } from '../../../utils/apiError';
import { logger } from '../../../utils/logger';
import { ENV } from '../../../config/environment';

export class AISkinAnalysisValidator {
  /**
   * Validates and sanitizes raw JSON returned by the Gemini AI model.
   * Ensures all enums, numbers, ranges, and structures adhere to strict business rules.
   */
  static validate(raw: any): IValidatedAIOutput {
    if (!raw || typeof raw !== 'object') {
      logger.error('[AI Validator] Gemini output is not a valid JSON object:', raw);
      throw ApiError.aiResponseInvalid('AI provider returned empty or non-object response');
    }

    const validationErrors: string[] = [];

    // 1. Validate status
    const status = raw.status;
    if (status !== 'SUCCESS' && status !== 'REJECTED') {
      validationErrors.push(`Invalid status "${status}". Expected "SUCCESS" or "REJECTED"`);
    }

    // Handle REJECTED case (image quality unsuitable)
    if (status === 'REJECTED') {
      const rejectionReason =
        typeof raw.rejectionReason === 'string' && raw.rejectionReason.trim()
          ? raw.rejectionReason.trim()
          : 'IMAGE_QUALITY_INSUFFICIENT';

      const rejectionMessage =
        typeof raw.rejectionMessage === 'string' && raw.rejectionMessage.trim()
          ? raw.rejectionMessage.trim()
          : 'Please upload a clear, well-lit facial photo.';

      return {
        status: 'REJECTED',
        rejectionReason,
        rejectionMessage,
        analysisVersion: ENV.AI_ANALYSIS_VERSION,
        concerns: [],
      };
    }

    // 2. Validate skinType
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

    // 3. Validate concerns
    const validatedConcerns: IAISkinConcernResult[] = [];
    if (raw.concerns) {
      if (!Array.isArray(raw.concerns)) {
        validationErrors.push('Field "concerns" must be an array');
      } else {
        for (let i = 0; i < raw.concerns.length; i++) {
          const item = raw.concerns[i];
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

    // 4. Validate observations
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
        if (val === null || val === undefined) {
          validatedObservations[key] = null;
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

    // Check for critical validation errors
    if (validationErrors.length > 0) {
      logger.error('[AI Validator] Schema validation failed for Gemini response:', {
        errors: validationErrors,
        raw,
      });
      throw ApiError.aiResponseInvalid(
        `Gemini response validation failed: ${validationErrors.join('; ')}`,
        validationErrors.map((e) => ({ message: e }))
      );
    }

    return {
      status: 'SUCCESS',
      analysisVersion: ENV.AI_ANALYSIS_VERSION,
      skinType: validatedSkinType,
      concerns: validatedConcerns,
      observations: validatedObservations,
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : undefined,
    };
  }
}
