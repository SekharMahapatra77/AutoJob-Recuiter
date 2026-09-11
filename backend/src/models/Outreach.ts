import mongoose, { Document, Schema } from 'mongoose';
import { OutreachStatus } from '../types';

export interface IOutreach extends Document {
  recruiterId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  candidateId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  recipientEmail: string;
  subject: string;
  body: string;
  attachmentId?: mongoose.Types.ObjectId;
  status: OutreachStatus;
  sentAt?: Date;
  messageId?: string;
  threadId?: string;
  followUpCount: number;
  lastFollowUpAt?: Date;
  nextFollowUpAt?: Date;
  sendMethod: 'GMAIL_OAUTH' | 'SMTP' | 'MANUAL';
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachSchema = new Schema<IOutreach>(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    attachmentId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'REPLIED', 'BOUNCED', 'FAILED', 'COMPLETED'],
      default: 'DRAFT',
      index: true
    },
    sentAt: { type: Date },
    messageId: { type: String, trim: true, index: true },
    threadId: { type: String, trim: true, index: true },
    followUpCount: { type: Number, default: 0 },
    lastFollowUpAt: { type: Date },
    nextFollowUpAt: { type: Date, index: true },
    sendMethod: { type: String, enum: ['GMAIL_OAUTH', 'SMTP', 'MANUAL'], default: 'GMAIL_OAUTH' },
    errorDetails: { type: String }
  },
  { timestamps: true }
);

OutreachSchema.index({ recipientEmail: 1, jobId: 1 });
OutreachSchema.index({ campaignId: 1, status: 1 });

export const Outreach = mongoose.model<IOutreach>('Outreach', OutreachSchema);
