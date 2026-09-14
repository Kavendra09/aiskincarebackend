import {
  AISkinTypeValue,
  AISkinConcernType,
  AISeverityLevel,
  IAIObservations,
  IAISkinTypeResult,
  IAISkinConcernResult,
  IAISkinRecommendation,
  ImageAngle,
} from '../../../models/SkinAnalysis';

export interface IUploadedPhotoInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
  angle: ImageAngle;
}

export interface IUserProfileContext {
  age?: number;
  gender?: string;
  userDeclaredSkinType?: string;
  userDeclaredConcerns?: string[];
  lifestyle?: {
    waterIntakeLiters?: number;
    sleepHours?: number;
    sunscreenUsage?: string;
    stressLevel?: string;
  };
}

export interface IStartAnalysisDTO {
  userId: string;
  photos: IUploadedPhotoInput[];
  userContext?: IUserProfileContext;
}

export type AIAnalysisStatus = 'SUCCESS' | 'REJECTED';
export type GeminiAnalysisStatus = AIAnalysisStatus;

export type AIRejectionReason =
  | 'IMAGE_QUALITY_INSUFFICIENT'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'FACE_OBSTRUCTED'
  | 'EXCESSIVE_BLUR'
  | 'EXTREME_LIGHTING'
  | 'EXTREME_ANGLE';

export interface IRawGroqResponse {
  analysisStatus?: 'completed' | 'rejected' | string;
  status?: AIAnalysisStatus | string;
  imageQuality?: {
    isUsable: boolean;
    reason: string | null;
  };
  rejectionReason?: AIRejectionReason | string;
  rejectionMessage?: string;
  skinType?: {
    value: AISkinTypeValue;
    confidence: number;
  };
  concerns?: Array<{
    type: AISkinConcernType;
    severity: AISeverityLevel;
    confidence: number;
  }>;
  observations?: {
    oiliness: number | string | null;
    dryness: number | string | null;
    redness: number | string | null;
    visiblePores: number | string | null;
    texture: number | string | null;
    unevenTone: number | string | null;
    darkCircles: number | string | null;
  };
  recommendations?: Array<{
    concern: string;
    productType: string;
    keyIngredient: string;
    reason: string;
  }>;
  summary?: string;
}

export type IRawGeminiResponse = IRawGroqResponse;

export interface IValidatedAIOutput {
  status: AIAnalysisStatus;
  rejectionReason?: string;
  rejectionMessage?: string;
  analysisVersion: string;
  skinType?: IAISkinTypeResult;
  concerns: IAISkinConcernResult[];
  observations?: IAIObservations;
  recommendations?: IAISkinRecommendation[];
  summary?: string;
}
