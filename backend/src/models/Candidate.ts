import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidate extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  location: string;
  primarySkills: string[];
  yearsOfExperience: number;
  preferredRoles: string[];
  preferredEmploymentType: string;
  portfolio: string;
  github: string;
  linkedin: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    primarySkills: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0 },
    preferredRoles: { type: [String], default: [] },
    preferredEmploymentType: { type: String, default: 'C2C' },
    portfolio: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    summary: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Candidate = mongoose.model<ICandidate>('Candidate', CandidateSchema);
