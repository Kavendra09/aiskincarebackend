import { Type, Schema } from '@google/genai';
import {
  AI_SKIN_TYPES,
  AI_SKIN_CONCERN_TYPES,
  AI_SEVERITY_LEVELS,
} from '../../../models/SkinAnalysis';

/**
 * Enforced Gemini API Structured JSON Response Schema.
 * Guarantees model outputs comply with our strict formatting expectations.
 */
export const geminiSkinAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['SUCCESS', 'REJECTED'],
      description: 'Whether the photo was successfully analyzed or rejected due to quality/safety',
    },
    rejectionReason: {
      type: Type.STRING,
      description: 'Controlled rejection code (e.g. IMAGE_QUALITY_INSUFFICIENT, NO_FACE_DETECTED, EXCESSIVE_BLUR)',
    },
    rejectionMessage: {
      type: Type.STRING,
      description: 'User-facing explanation of why image cannot be analyzed',
    },
    skinType: {
      type: Type.OBJECT,
      properties: {
        value: {
          type: Type.STRING,
          enum: [...AI_SKIN_TYPES],
          description: 'Estimated skin type or uncertain',
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Confidence in visual estimation between 0.0 and 1.0',
        },
      },
    },
    concerns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [...AI_SKIN_CONCERN_TYPES],
            description: 'Controlled cosmetic skin concern identifier',
          },
          severity: {
            type: Type.STRING,
            enum: [...AI_SEVERITY_LEVELS],
            description: 'Severity level (none, mild, moderate, high, uncertain)',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Confidence between 0.0 and 1.0',
          },
        },
        required: ['type', 'severity', 'confidence'],
      },
    },
    observations: {
      type: Type.OBJECT,
      properties: {
        oiliness: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        dryness: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        redness: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        visiblePores: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        unevenTone: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        texture: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
        darkCircles: {
          type: Type.INTEGER,
          description: 'Observed intensity from 0 to 100, or null if unobservable',
        },
      },
    },
    summary: {
      type: Type.STRING,
      description: 'Concise non-medical visual observations summary',
    },
  },
  required: ['status'],
};
