import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  metadata?: Record<string, any>;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
