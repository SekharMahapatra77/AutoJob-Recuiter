import { Activity } from '../models/Activity';
import mongoose from 'mongoose';

export const logActivity = async (
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  userId?: string | mongoose.Types.ObjectId,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    await Activity.create({
      action,
      entityType,
      entityId: entityId ? entityId.toString() : undefined,
      details,
      userId: userId ? new mongoose.Types.ObjectId(userId.toString()) : undefined,
      metadata,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to record activity:', err);
  }
};
