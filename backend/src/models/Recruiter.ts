import mongoose, { Document, Schema } from 'mongoose';
import { RecruiterStatus } from '../types';

export interface IRecruiter extends Document {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  location: string;
  phone: string;
  source: string;
  verified: boolean;
  notes: string;
  status: RecruiterStatus;
  optedOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterSchema = new Schema<IRecruiter>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    company: { type: String, required: true, trim: true, index: true },
    jobTitle: { type: String, default: 'Technical Recruiter', trim: true },
    linkedinUrl: { type: String, default: '', trim: true },
    location: { type: String, default: 'USA', trim: true },
    phone: { type: String, default: '', trim: true },
    source: { type: String, default: 'MANUAL' },
    verified: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'NEW',
        'VERIFIED',
        'READY',
        'CONTACTED',
        'FOLLOW_UP',
        'REPLIED',
        'INTERESTED',
        'NOT_INTERESTED',
        'CLOSED'
      ],
      default: 'NEW',
      index: true
    },
    optedOut: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

RecruiterSchema.index({ company: 1, email: 1 });

export const Recruiter = mongoose.model<IRecruiter>('Recruiter', RecruiterSchema);
