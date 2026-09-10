import mongoose, { Document, Schema } from 'mongoose';
import { CampaignStatus } from '../types';

export interface ICampaign extends Document {
  name: string;
  description: string;
  targetTechnology: string;
  targetLocation: string;
  c2cOnly: boolean;
  startDate: Date;
  endDate?: Date;
  status: CampaignStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    targetTechnology: { type: String, default: '' },
    targetLocation: { type: String, default: 'USA' },
    c2cOnly: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'DRAFT',
      index: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
