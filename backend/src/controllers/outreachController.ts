import { Request, Response, NextFunction } from 'express';
import { Outreach } from '../models/Outreach';
import { Recruiter } from '../models/Recruiter';
import { Job } from '../models/Job';
import { Resume } from '../models/Resume';
import { Candidate } from '../models/Candidate';
import { DuplicateLog } from '../models/DuplicateLog';
import { checkAndLogDuplicateOutreach } from '../services/duplicatePrevention';
import { scheduleInitialFollowUps } from '../services/outreach/followUpService';
import { gmailService } from '../services/gmail/gmailService';
import { logActivity } from '../services/activityLogger';
import { AuthenticatedRequest } from '../middleware/auth';

export const getOutreachList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, campaignId, recruiterId, page = '1', limit = '15' } = req.query;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (campaignId) filter.campaignId = campaignId;
    if (recruiterId) filter.recruiterId = recruiterId;

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [outreachList, total] = await Promise.all([
      Outreach.find(filter)
        .populate('recruiterId', 'name email company status')
        .populate('jobId', 'title company location c2cStatus')
        .populate('campaignId', 'name')
        .populate('attachmentId', 'fileName type version')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Outreach.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        outreachList,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const checkDuplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { recipientEmail, recruiterId, jobId, campaignId } = req.body;
    const checkResult = await checkAndLogDuplicateOutreach(recipientEmail, recruiterId, jobId, campaignId);
    res.json({ success: true, data: checkResult });
  } catch (err) {
    next(err);
  }
};

export const sendOutreach = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      recruiterId,
      jobId,
      candidateId,
      campaignId,
      recipientEmail,
      subject,
      body,
      attachmentId
    } = req.body;

    if (!recipientEmail || !subject || !body || !recruiterId) {
      res.status(400).json({
        success: false,
        message: 'Recipient email, subject, body, and recruiter are required.'
      });
      return;
    }

    const normalizedEmail = recipientEmail.trim().toLowerCase();

    // 1. Mandatory Duplicate Prevention Check
    const dupCheck = await checkAndLogDuplicateOutreach(normalizedEmail, recruiterId, jobId, campaignId);
    if (dupCheck.isDuplicate) {
      res.status(409).json({
        success: false,
        reason: 'DUPLICATE_OUTREACH',
        message: dupCheck.reason || 'Outreach blocked because this recruiter has already been contacted.'
      });
      return;
    }

    // 2. Check recruiter opt-out status
    const recruiter = await Recruiter.findById(recruiterId);
    if (recruiter?.optedOut || recruiter?.status === 'NOT_INTERESTED') {
      res.status(400).json({
        success: false,
        message: 'Cannot contact recruiter who has opted out or is marked as NOT_INTERESTED.'
      });
      return;
    }

    // 3. Resolve attachment if selected
    let attachmentPath: string | undefined;
    let attachmentName: string | undefined;
    if (attachmentId) {
      const resume = await Resume.findById(attachmentId);
      if (resume && resume.filePath) {
        attachmentPath = resume.filePath;
        attachmentName = resume.fileName;
      }
    }

    // 4. Send email via Gmail / SMTP / Simulated using current user's credentials
    const sendResult = await gmailService.sendEmail(req.user!.id, {
      to: normalizedEmail,
      subject,
      body,
      attachmentPath,
      attachmentName
    });

    // 5. Create Outreach record
    const outreach = await Outreach.create({
      userId: req.user!.id,
      recruiterId,
      jobId: jobId || undefined,
      candidateId: candidateId || undefined,
      campaignId: campaignId || undefined,
      recipientEmail: normalizedEmail,
      subject,
      body,
      attachmentId: attachmentId || undefined,
      status: 'SENT',
      sentAt: new Date(),
      messageId: sendResult.messageId,
      threadId: sendResult.threadId,
      sendMethod: sendResult.method === 'SIMULATED' ? 'MANUAL' : sendResult.method,
      followUpCount: 0
    });

    // 6. Schedule follow-ups automatically with owner user ID
    await scheduleInitialFollowUps(outreach._id.toString(), recruiterId, req.user!.id);

    // 7. Update Recruiter & Job status
    await Recruiter.findByIdAndUpdate(recruiterId, { status: 'CONTACTED' });
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { status: 'CONTACTED' });
    }

    // 8. Record Activity
    await logActivity(
      'EMAIL_SENT',
      'Outreach',
      outreach._id.toString(),
      `Sent C2C outreach to ${normalizedEmail} (Subject: "${subject}")`,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      message: 'Outreach email sent and follow-ups scheduled successfully.',
      data: outreach
    });
  } catch (err) {
    next(err);
  }
};

export const saveDraft = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { recruiterId, jobId, candidateId, campaignId, recipientEmail, subject, body, attachmentId } = req.body;

    const outreach = await Outreach.create({
      recruiterId,
      jobId: jobId || undefined,
      candidateId: candidateId || undefined,
      campaignId: campaignId || undefined,
      recipientEmail: (recipientEmail || '').trim().toLowerCase(),
      subject: subject || 'Untitled Outreach Draft',
      body: body || '',
      attachmentId: attachmentId || undefined,
      status: 'DRAFT'
    });

    res.status(201).json({ success: true, data: outreach });
  } catch (err) {
    next(err);
  }
};

export const getDuplicateLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await DuplicateLog.find()
      .populate('recruiterId', 'name company')
      .populate('jobId', 'title company')
      .sort({ attemptedAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};
