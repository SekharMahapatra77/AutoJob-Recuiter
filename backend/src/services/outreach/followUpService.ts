import mongoose from 'mongoose';
import { FollowUp } from '../../models/FollowUp';
import { Outreach } from '../../models/Outreach';
import { Recruiter } from '../../models/Recruiter';
import { gmailService } from '../gmail/gmailService';
import { logActivity } from '../activityLogger';

const MAX_FOLLOW_UPS = 2;

export const scheduleInitialFollowUps = async (
  outreachId: string,
  recruiterId: string,
  userId?: string
): Promise<void> => {
  const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : undefined;

  // Follow-up #1: 3 days later
  const followUp1Date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await FollowUp.create({
    outreachId,
    recruiterId,
    userId: userObjectId,
    sequenceNumber: 1,
    scheduledDate: followUp1Date,
    status: 'PENDING',
    subject: 'Following up on C2C opportunity',
    body: 'Hi, just following up on my previous note regarding the open role. Wanted to check if your team is actively reviewing C2C profiles this week.'
  });

  // Follow-up #2: 7 days later
  const followUp2Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await FollowUp.create({
    outreachId,
    recruiterId,
    userId: userObjectId,
    sequenceNumber: 2,
    scheduledDate: followUp2Date,
    status: 'PENDING',
    subject: 'Quick check-in: C2C candidate availability',
    body: 'Hi, touching base one final time to see if the position has been filled or if you would like me to resend our candidate resume. Thank you!'
  });

  // Update outreach nextFollowUpAt
  await Outreach.findByIdAndUpdate(outreachId, { nextFollowUpAt: followUp1Date });
};

export const stopFollowUpsForRecruiter = async (recruiterId: string, reason: string): Promise<number> => {
  const result = await FollowUp.updateMany(
    { recruiterId, status: 'PENDING' },
    { status: 'CANCELLED', notes: `Cancelled: ${reason}` }
  );

  await Outreach.updateMany(
    { recruiterId, status: { $in: ['SENT', 'DELIVERED', 'SCHEDULED'] } },
    { nextFollowUpAt: null }
  );

  return result.modifiedCount;
};

export const processDueFollowUps = async (): Promise<{ processed: number; cancelled: number }> => {
  const now = new Date();
  const dueFollowUps = await FollowUp.find({
    status: 'PENDING',
    scheduledDate: { $lte: now }
  }).populate('recruiterId outreachId');

  let processed = 0;
  let cancelled = 0;

  for (const followUp of dueFollowUps) {
    const recruiter: any = followUp.recruiterId;
    const outreach: any = followUp.outreachId;

    if (!recruiter || !outreach) {
      followUp.status = 'CANCELLED';
      followUp.notes = 'Missing recruiter or outreach link';
      await followUp.save();
      cancelled++;
      continue;
    }

    // Rule 1: Stop if recruiter replied
    if (outreach.status === 'REPLIED' || recruiter.status === 'REPLIED') {
      followUp.status = 'CANCELLED';
      followUp.notes = 'Recruiter has already replied to outreach';
      await followUp.save();
      cancelled++;
      continue;
    }

    // Rule 2: Stop if recruiter is NOT_INTERESTED or optedOut
    if (recruiter.status === 'NOT_INTERESTED' || recruiter.optedOut) {
      followUp.status = 'CANCELLED';
      followUp.notes = 'Recruiter marked not interested or opted out';
      await followUp.save();
      cancelled++;
      continue;
    }

    // Rule 3: Stop if max follow-up count reached
    if (outreach.followUpCount >= MAX_FOLLOW_UPS) {
      followUp.status = 'CANCELLED';
      followUp.notes = `Maximum follow-up limit (${MAX_FOLLOW_UPS}) reached`;
      await followUp.save();
      cancelled++;
      continue;
    }

    // Resolve owner user ID: check followUp.userId or outreach.userId
    const ownerUserId = followUp.userId?.toString() || outreach.userId?.toString() || undefined;

    // Dispatch follow-up email
    try {
      const sendResult = await gmailService.sendEmail(ownerUserId, {
        to: outreach.recipientEmail,
        subject: `${followUp.subject} (Re: ${outreach.subject})`,
        body: followUp.body
      });

      followUp.status = 'SENT';
      followUp.sentAt = new Date();
      followUp.messageId = sendResult.messageId;
      await followUp.save();

      // Update outreach
      const nextPending = await FollowUp.findOne({
        outreachId: outreach._id,
        status: 'PENDING',
        scheduledDate: { $gt: now }
      }).sort({ scheduledDate: 1 });

      await Outreach.findByIdAndUpdate(outreach._id, {
        followUpCount: outreach.followUpCount + 1,
        lastFollowUpAt: new Date(),
        nextFollowUpAt: nextPending ? nextPending.scheduledDate : null
      });

      await Recruiter.findByIdAndUpdate(recruiter._id, { status: 'FOLLOW_UP' });

      await logActivity(
        'FOLLOW_UP_SENT',
        'Outreach',
        outreach._id.toString(),
        `Follow-up #${followUp.sequenceNumber} sent to ${recruiter.name} (${recruiter.email})`
      );

      processed++;
    } catch (err: any) {
      console.error(`[FollowUp] Error sending follow-up ${followUp._id}:`, err.message);
    }
  }

  return { processed, cancelled };
};
