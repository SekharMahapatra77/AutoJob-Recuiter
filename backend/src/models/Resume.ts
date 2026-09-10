import mongoose, { Document, Schema } from 'mongoose';

export interface IResume extends Document {
  candidateId: mongoose.Types.ObjectId;
  fileName: string;
  filePath: string;
  fileSize: number;
  parsedText: string;
  extractedSkills: string[];
  type: 'MASTER' | 'CUSTOMIZED';
  isPrimary: boolean;
  version: number;
  source: string;
  targetJobId?: mongoose.Types.ObjectId;
  matchScore?: number;
  tailoredSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    parsedText: { type: String, default: '' },
    extractedSkills: { type: [String], default: [] },
    type: { type: String, enum: ['MASTER', 'CUSTOMIZED'], default: 'MASTER' },
    isPrimary: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    source: { type: String, default: 'UPLOAD' },
    targetJobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    matchScore: { type: Number },
    tailoredSummary: { type: String }
  },
  { timestamps: true }
);

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);
