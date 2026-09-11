import {
  AISkinTypeValue,
  AISkinConcernType,
  AISeverityLevel,
  IAIObservations,
  IAISkinTypeResult,
  IAISkinConcernResult,
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

export type GeminiAnalysisStatus = 'SUCCESS' | 'REJECTED';

export type GeminiRejectionReason =
  | 'IMAGE_QUALITY_INSUFFICIENT'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'FACE_OBSTRUCTED'
  | 'EXCESSIVE_BLUR'
  | 'EXTREME_LIGHTING'
  | 'EXTREME_ANGLE';

export interface IRawGeminiResponse {
  status: GeminiAnalysisStatus;
  rejectionReason?: GeminiRejectionReason | string;
  rejectionMessage?: string;
  analysisVersion?: string;
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
    oiliness: number | null;
    dryness: number | null;
    redness: number | null;
    visiblePores: number | null;
    unevenTone: number | null;
    texture: number | null;
    darkCircles: number | null;
  };
  summary?: string;
}

export interface IValidatedAIOutput {
  status: GeminiAnalysisStatus;
  rejectionReason?: string;
  rejectionMessage?: string;
  analysisVersion: string;
  skinType?: IAISkinTypeResult;
  concerns: IAISkinConcernResult[];
  observations?: IAIObservations;
  summary?: string;
}
