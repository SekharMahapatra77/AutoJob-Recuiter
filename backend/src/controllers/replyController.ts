import { Request, Response, NextFunction } from 'express';
import { Reply } from '../models/Reply';
import { Recruiter } from '../models/Recruiter';
import { Outreach } from '../models/Outreach';
import { imapService } from '../services/imap/imapService';
import { stopFollowUpsForRecruiter } from '../services/outreach/followUpService';
import { logActivity } from '../services/activityLogger';

export const getReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, page = '1', limit = '15' } = req.query;
    const filter: Record<string, any> = {};

    if (category) filter.category = category;

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [replies, total] = await Promise.all([
      Reply.find(filter)
        .populate('recruiterId', 'name email company status')
        .populate('outreachId', 'subject sentAt jobId campaignId')
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Reply.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        replies,
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

export const getReplyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reply = await Reply.findById(req.params.id)
      .populate('recruiterId')
      .populate({
        path: 'outreachId',
        populate: [
          { path: 'jobId' },
          { path: 'campaignId' }
        ]
      });

    if (!reply) {
      res.status(404).json({ success: false, message: 'Reply not found.' });
      return;
    }

    // Also fetch outreach history with this recruiter
    const history = await Outreach.find({ recruiterId: reply.recruiterId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        reply,
        outreachHistory: history
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateReplyCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, notes } = req.body;

    const reply = await Reply.findByIdAndUpdate(
      req.params.id,
      { category, ...(notes !== undefined && { notes }) },
      { new: true }
    );

    if (!reply) {
      res.status(404).json({ success: false, message: 'Reply not found.' });
      return;
    }

    // Update recruiter status accordingly
    if (category === 'INTERESTED' || category === 'INTERVIEW') {
      await Recruiter.findByIdAndUpdate(reply.recruiterId, { status: 'INTERESTED' });
    } else if (category === 'NOT_INTERESTED') {
      await Recruiter.findByIdAndUpdate(reply.recruiterId, { status: 'NOT_INTERESTED' });
      await stopFollowUpsForRecruiter(reply.recruiterId.toString(), 'Marked not interested manually');
    }

    res.json({ success: true, data: reply });
  } catch (err) {
    next(err);
  }
};

export const simulateIncomingReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { senderEmail, subject, body } = req.body;

    if (!senderEmail || !body) {
      res.status(400).json({ success: false, message: 'senderEmail and body are required.' });
      return;
    }

    const messageId = `simulated-${Date.now()}@inbound.recruitment.test`;
    const reply = await imapService.processIncomingEmail(
      senderEmail,
      subject || 'Re: C2C Senior Consultant',
      body,
      messageId
    );

    if (!reply) {
      res.status(404).json({
        success: false,
        message: `No recruiter found with email: ${senderEmail}. Please ensure the recruiter exists before simulating a reply.`
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Incoming reply processed and classified successfully.',
      data: reply
    });
  } catch (err) {
    next(err);
  }
};

export const syncImapNow = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await imapService.syncInbox();
    res.json({
      success: true,
      message: `IMAP sync finished. ${result.checked} checked, ${result.imported} new replies.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
