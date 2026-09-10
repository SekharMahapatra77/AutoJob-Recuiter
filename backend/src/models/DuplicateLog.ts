import mongoose, { Document, Schema } from 'mongoose';

export interface IDuplicateLog extends Document {
  recruiterEmail: string;
  recruiterId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  attemptedAt: Date;
  reason: string;
  action: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const DuplicateLogSchema = new Schema<IDuplicateLog>(
  {
    recruiterEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter', index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    attemptedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    action: { type: String, default: 'BLOCKED' },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const DuplicateLog = mongoose.model<IDuplicateLog>('DuplicateLog', DuplicateLogSchema);
