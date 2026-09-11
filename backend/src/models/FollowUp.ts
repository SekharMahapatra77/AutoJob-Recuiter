import mongoose, { Document, Schema } from 'mongoose';
import { FollowUpStatus } from '../types';

export interface IFollowUp extends Document {
  outreachId: mongoose.Types.ObjectId;
  recruiterId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sequenceNumber: number;
  scheduledDate: Date;
  status: FollowUpStatus;
  subject: string;
  body: string;
  sentAt?: Date;
  messageId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    outreachId: { type: Schema.Types.ObjectId, ref: 'Outreach', required: true, index: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sequenceNumber: { type: Number, required: true, default: 1 },
    scheduledDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'CANCELLED', 'SKIPPED'],
      default: 'PENDING',
      index: true
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date },
    messageId: { type: String },
    notes: { type: String }
  },
  { timestamps: true }
);

FollowUpSchema.index({ status: 1, scheduledDate: 1 });

export const FollowUp = mongoose.model<IFollowUp>('FollowUp', FollowUpSchema);
