import mongoose, { Document, Schema } from 'mongoose';
import { C2CStatus, JobSource, JobStatus } from '../types';

export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  employmentType: string;
  c2cStatus: C2CStatus;
  c2cVerified: boolean;
  c2cVerificationSource: string;
  isUSA: boolean;
  source: JobSource;
  sourceUrl: string;
  recruiterId?: mongoose.Types.ObjectId;
  status: JobStatus;
  createdBy?: mongoose.Types.ObjectId;
  salary?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true, index: true },
    company: { type: String, required: true, trim: true, index: true },
    location: { type: String, default: 'USA', trim: true },
    description: { type: String, default: '' },
    skills: { type: [String], default: [] },
    employmentType: { type: String, default: 'C2C' },
    c2cStatus: { type: String, enum: ['YES', 'NO', 'UNKNOWN'], default: 'UNKNOWN', index: true },
    c2cVerified: { type: Boolean, default: false },
    c2cVerificationSource: { type: String, default: 'SYSTEM_DETECTION' },
    isUSA: { type: Boolean, default: true, index: true },
    source: { type: String, enum: ['LINKEDIN', 'CSV', 'MANUAL', 'OTHER'], default: 'MANUAL' },
    sourceUrl: { type: String, default: '', trim: true, index: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: 'Recruiter' },
    status: {
      type: String,
      enum: ['NEW', 'REVIEWING', 'QUALIFIED', 'DISQUALIFIED', 'OUTREACH_READY', 'CONTACTED', 'CLOSED'],
      default: 'NEW',
      index: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    salary: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

JobSchema.index({ company: 1, title: 1 });
JobSchema.index({ isUSA: 1, c2cStatus: 1, status: 1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
