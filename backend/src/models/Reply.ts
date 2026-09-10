import mongoose, { Document, Schema } from 'mongoose';
import { ReplyCategory } from '../types';

export interface IReply extends Document {
  recruiterId: mongoose.Types.ObjectId;
  outreachId?: mongoose.Types.ObjectId;
  messageId: string;
  threadId?: string;
  sender: string;
  subject: string;
  body: string;
  category: ReplyCategory;
  confidence: number;
  receivedAt: Date;
  processed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter', required: true, index: true },
    outreachId: { type: Schema.Types.ObjectId, ref: 'Outreach', index: true },
    messageId: { type: String, required: true, unique: true, index: true },
    threadId: { type: String, index: true },
    sender: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'INTERESTED',
        'NOT_INTERESTED',
        'REQUEST_FOR_INFORMATION',
        'INTERVIEW',
        'OUT_OF_OFFICE',
        'UNKNOWN'
      ],
      default: 'UNKNOWN',
      index: true
    },
    confidence: { type: Number, default: 0.5 },
    receivedAt: { type: Date, default: Date.now, index: true },
    processed: { type: Boolean, default: false },
    notes: { type: String }
  },
  { timestamps: true }
);

export const Reply = mongoose.model<IReply>('Reply', ReplySchema);
