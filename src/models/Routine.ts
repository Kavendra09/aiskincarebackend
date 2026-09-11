import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const ROUTINE_STEP_CATEGORIES = [
  'cleanser',
  'face-wash',
  'toner',
  'serum',
  'treatment',
  'moisturizer',
  'sunscreen',
  'eye-cream',
  'exfoliator',
  'face-mask',
  'lip-care',
  'other',
] as const;

export type RoutineStepCategory = (typeof ROUTINE_STEP_CATEGORIES)[number];

export interface IRoutineStep {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  category: RoutineStepCategory;
  order: number;
  isActive: boolean;
}

export interface IRoutine {
  userId: Types.ObjectId;
  name: string;
  type: 'morning' | 'night' | 'custom';
  description?: string;
  steps: IRoutineStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoutineDocument extends IRoutine, Document {}

const routineStepSchema = new Schema<IRoutineStep>(
  {
    title: {
      type: String,
      required: [true, 'Step title is required'],
      trim: true,
      maxlength: [100, 'Step title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ROUTINE_STEP_CATEGORIES,
        message: '{VALUE} is not a valid routine step category',
      },
      default: 'other',
    },
    order: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
);

const routineSchema = new Schema<IRoutineDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Routine name is required'],
      trim: true,
      maxlength: [100, 'Routine name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: ['morning', 'night', 'custom'],
      required: [true, 'Routine type is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    steps: [routineStepSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
routineSchema.index({ userId: 1, type: 1 });

export const Routine: Model<IRoutineDocument> = mongoose.model<IRoutineDocument>(
  'Routine',
  routineSchema
);
