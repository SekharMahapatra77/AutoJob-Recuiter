import { Outreach } from '../models/Outreach';
import { DuplicateLog } from '../models/DuplicateLog';
import mongoose from 'mongoose';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  previousOutreach?: any;
}

export const checkAndLogDuplicateOutreach = async (
  recipientEmail: string,
  recruiterId?: string | mongoose.Types.ObjectId,
  jobId?: string | mongoose.Types.ObjectId,
  campaignId?: string | mongoose.Types.ObjectId
): Promise<DuplicateCheckResult> => {
  const normalizedEmail = (recipientEmail || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      isDuplicate: true,
      reason: 'INVALID_EMAIL: Recipient email address is missing or blank.'
    };
  }

  // 1. Check if same recruiter/email was already contacted for the exact same job
  if (jobId) {
    const existingJobOutreach = await Outreach.findOne({
      recipientEmail: normalizedEmail,
      jobId,
      status: { $in: ['SENT', 'DELIVERED', 'REPLIED', 'SENDING', 'SCHEDULED'] }
    });

    if (existingJobOutreach) {
      const reason = `DUPLICATE_OUTREACH: Recipient ${normalizedEmail} has already been contacted for this job.`;
      
      await DuplicateLog.create({
        recruiterEmail: normalizedEmail,
        recruiterId: recruiterId ? new mongoose.Types.ObjectId(recruiterId.toString()) : undefined,
        jobId: new mongoose.Types.ObjectId(jobId.toString()),
        campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId.toString()) : undefined,
        attemptedAt: new Date(),
        reason,
        action: 'BLOCKED'
      });

      return {
        isDuplicate: true,
        reason,
        previousOutreach: existingJobOutreach
      };
    }
  }

  // 2. Check if same email was contacted within the last 48 hours for any job (cooldown protection)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentOutreach = await Outreach.findOne({
    recipientEmail: normalizedEmail,
    sentAt: { $gte: twoDaysAgo },
    status: { $in: ['SENT', 'DELIVERED', 'SENDING'] }
  });

  if (recentOutreach) {
    const reason = `COOLDOWN_PROTECTION: Recipient ${normalizedEmail} was contacted within the last 48 hours (on ${recentOutreach.sentAt?.toISOString().split('T')[0]}).`;

    await DuplicateLog.create({
      recruiterEmail: normalizedEmail,
      recruiterId: recruiterId ? new mongoose.Types.ObjectId(recruiterId.toString()) : undefined,
      jobId: jobId ? new mongoose.Types.ObjectId(jobId.toString()) : undefined,
      campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId.toString()) : undefined,
      attemptedAt: new Date(),
      reason,
      action: 'BLOCKED'
    });

    return {
      isDuplicate: true,
      reason,
      previousOutreach: recentOutreach
    };
  }

  return { isDuplicate: false };
};
