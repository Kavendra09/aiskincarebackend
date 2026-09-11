import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IRoutineCompletion {
  userId: Types.ObjectId;
  routineId: Types.ObjectId;
  stepId: Types.ObjectId;
  date: string; // Stored in YYYY-MM-DD format for fast, precise date querying
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoutineCompletionDocument extends IRoutineCompletion, Document {}

const routineCompletionSchema = new Schema<IRoutineCompletionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    routineId: {
      type: Schema.Types.ObjectId,
      ref: 'Routine',
      required: true,
      index: true,
    },
    stepId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: prevents duplicate completion for the same user, routine, step and date
routineCompletionSchema.index(
  { userId: 1, routineId: 1, stepId: 1, date: 1 },
  { unique: true }
);

// Index for fast query of user's completion on specific dates (e.g. today or weekly range)
routineCompletionSchema.index({ userId: 1, date: 1 });

export const RoutineCompletion: Model<IRoutineCompletionDocument> =
  mongoose.model<IRoutineCompletionDocument>('RoutineCompletion', routineCompletionSchema);
