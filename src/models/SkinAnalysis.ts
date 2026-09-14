import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const AI_SKIN_TYPES = [
  'oily',
  'dry',
  'combination',
  'normal',
  'sensitive',
  'uncertain',
] as const;

export type AISkinTypeValue = (typeof AI_SKIN_TYPES)[number];

export const AI_SKIN_CONCERN_TYPES = [
  'acne',
  'pimples',
  'dark_spots',
  'pigmentation',
  'redness',
  'dryness',
  'large_pores',
  'blackheads',
  'whiteheads',
  'dull_skin',
  'uneven_skin_tone',
  'uneven_texture',
  'wrinkles',
  'fine_lines',
  'dark_circles',
  'sun_tan',
] as const;

export type AISkinConcernType = (typeof AI_SKIN_CONCERN_TYPES)[number];

export const AI_SEVERITY_LEVELS = [
  'none',
  'mild',
  'moderate',
  'high',
  'uncertain',
] as const;

export type AISeverityLevel = (typeof AI_SEVERITY_LEVELS)[number];

export const ANALYSIS_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected',
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export type ImageAngle = 'front' | 'left' | 'right';

export interface IAnalysisImage {
  url: string;
  publicId: string;
  angle: ImageAngle;
}

export interface IAISkinTypeResult {
  value: AISkinTypeValue;
  confidence: number;
}

export interface IAISkinConcernResult {
  type: AISkinConcernType;
  severity: AISeverityLevel;
  confidence: number;
}

export interface IAIObservations {
  oiliness: number | null;
  dryness: number | null;
  redness: number | null;
  visiblePores: number | null;
  unevenTone: number | null;
  texture: number | null;
  darkCircles: number | null;
}

export interface IAISkinRecommendation {
  concern: string;
  productType: string;
  keyIngredient: string;
  reason: string;
}

export interface ISkinAnalysis {
  userId: Types.ObjectId;
  images: IAnalysisImage[];
  imageHash?: string;
  status: AnalysisStatus;
  rejectionReason?: string;
  rejectionMessage?: string;
  analysisVersion: string;
  promptVersion: string;
  model: string;
  skinType?: IAISkinTypeResult;
  concerns: IAISkinConcernResult[];
  observations?: IAIObservations;
  recommendations?: IAISkinRecommendation[];
  glowScore?: number;
  potentialScore?: number | null;
  aiSummary?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISkinAnalysisDocument extends Omit<Document, 'model'>, ISkinAnalysis {}

const analysisImageSchema = new Schema<IAnalysisImage>(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
    },
    angle: {
      type: String,
      enum: ['front', 'left', 'right'],
      default: 'front',
      required: true,
    },
  },
  { _id: false }
);

const skinTypeResultSchema = new Schema<IAISkinTypeResult>(
  {
    value: {
      type: String,
      enum: AI_SKIN_TYPES,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
  },
  { _id: false }
);

const skinConcernResultSchema = new Schema<IAISkinConcernResult>(
  {
    type: {
      type: String,
      enum: AI_SKIN_CONCERN_TYPES,
      required: true,
    },
    severity: {
      type: String,
      enum: AI_SEVERITY_LEVELS,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
  },
  { _id: false }
);

const observationsSchema = new Schema<IAIObservations>(
  {
    oiliness: { type: Number, min: 0, max: 100, default: null },
    dryness: { type: Number, min: 0, max: 100, default: null },
    redness: { type: Number, min: 0, max: 100, default: null },
    visiblePores: { type: Number, min: 0, max: 100, default: null },
    unevenTone: { type: Number, min: 0, max: 100, default: null },
    texture: { type: Number, min: 0, max: 100, default: null },
    darkCircles: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const skinAnalysisSchema = new Schema<ISkinAnalysisDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    images: {
      type: [analysisImageSchema],
      required: [true, 'At least one facial image is required'],
      validate: [
        (val: IAnalysisImage[]) => val.length > 0,
        'At least one image is required',
      ],
    },
    imageHash: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ANALYSIS_STATUSES,
      default: 'completed',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectionMessage: {
      type: String,
      default: null,
    },
    analysisVersion: {
      type: String,
      required: true,
      default: '1.0',
    },
    promptVersion: {
      type: String,
      required: true,
      default: '1.0',
    },
    model: {
      type: String,
      required: true,
    },
    skinType: {
      type: skinTypeResultSchema,
      default: null,
    },
    concerns: {
      type: [skinConcernResultSchema],
      default: [],
    },
    observations: {
      type: observationsSchema,
      default: null,
    },
    recommendations: {
      type: [
        {
          concern: { type: String, default: '' },
          productType: { type: String, default: '' },
          keyIngredient: { type: String, default: '' },
          reason: { type: String, default: '' },
        },
      ],
      default: [],
    },
    glowScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    potentialScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    aiSummary: {
      type: String,
      default: null,
    },
    processingTime: {
      type: Number,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast history queries and duplicate lookups
skinAnalysisSchema.index({ userId: 1, createdAt: -1 });
skinAnalysisSchema.index({ userId: 1, imageHash: 1 });

export const SkinAnalysis: Model<ISkinAnalysisDocument> =
  mongoose.model<ISkinAnalysisDocument>('SkinAnalysis', skinAnalysisSchema);
