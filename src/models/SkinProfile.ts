import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const SKIN_TYPES = [
  'oily',
  'dry',
  'combination',
  'normal',
  'sensitive',
] as const;

export type SkinType = (typeof SKIN_TYPES)[number];

export const SKIN_CONCERNS = [
  'acne',
  'pimples',
  'dark-spots',
  'pigmentation',
  'redness',
  'dryness',
  'large-pores',
  'blackheads',
  'whiteheads',
  'dull-skin',
  'uneven-skin-tone',
  'wrinkles',
  'fine-lines',
  'dark-circles',
  'sun-tan',
] as const;

export type SkinConcern = (typeof SKIN_CONCERNS)[number];

export interface ILifestyle {
  waterIntakeLiters?: number;
  sleepHours?: number;
  sunscreenUsage?: 'always' | 'sometimes' | 'rarely' | 'never';
  smokingStatus?: 'non-smoker' | 'occasional' | 'regular';
  stressLevel?: 'low' | 'moderate' | 'high';
}

export interface ISkinProfile {
  userId: Types.ObjectId;
  skinType: SkinType;
  concerns: SkinConcern[];
  lifestyle: ILifestyle;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISkinProfileDocument extends ISkinProfile, Document {}

const skinProfileSchema = new Schema<ISkinProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true, // One active profile per user
      index: true,
    },
    skinType: {
      type: String,
      enum: {
        values: SKIN_TYPES,
        message: '{VALUE} is not a supported skin type',
      },
      required: [true, 'Please select your skin type'],
    },
    concerns: [
      {
        type: String,
        enum: {
          values: SKIN_CONCERNS,
          message: '{VALUE} is not a valid skin concern',
        },
      },
    ],
    lifestyle: {
      waterIntakeLiters: {
        type: Number,
        min: 0,
        max: 10,
        default: 2,
      },
      sleepHours: {
        type: Number,
        min: 0,
        max: 24,
        default: 7,
      },
      sunscreenUsage: {
        type: String,
        enum: ['always', 'sometimes', 'rarely', 'never'],
        default: 'sometimes',
      },
      smokingStatus: {
        type: String,
        enum: ['non-smoker', 'occasional', 'regular'],
        default: 'non-smoker',
      },
      stressLevel: {
        type: String,
        enum: ['low', 'moderate', 'high'],
        default: 'moderate',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const SkinProfile: Model<ISkinProfileDocument> =
  mongoose.model<ISkinProfileDocument>('SkinProfile', skinProfileSchema);
