import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IProgressImage {
  url: string;
  publicId: string;
}

export interface ISkinProgress {
  userId: Types.ObjectId;
  images: {
    front: IProgressImage;
    left?: IProgressImage;
    right?: IProgressImage;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISkinProgressDocument extends ISkinProgress, Document {}

const progressImageSubSchema = new Schema<IProgressImage>(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const skinProgressSchema = new Schema<ISkinProgressDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    images: {
      front: {
        type: progressImageSubSchema,
        required: [true, 'Front view image is required'],
      },
      left: {
        type: progressImageSubSchema,
      },
      right: {
        type: progressImageSubSchema,
      },
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's progress chronologically
skinProgressSchema.index({ userId: 1, createdAt: -1 });

export const SkinProgress: Model<ISkinProgressDocument> =
  mongoose.model<ISkinProgressDocument>('SkinProgress', skinProgressSchema);
