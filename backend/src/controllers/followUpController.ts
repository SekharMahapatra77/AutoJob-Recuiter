import { Request, Response, NextFunction } from 'express';
import { FollowUp } from '../models/FollowUp';
import { processDueFollowUps } from '../services/outreach/followUpService';

export const getFollowUps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [followUps, total] = await Promise.all([
      FollowUp.find(filter)
        .populate('recruiterId', 'name email company status')
        .populate('outreachId', 'recipientEmail subject status sentAt')
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(limitNum),
      FollowUp.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        followUps,
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

export const createFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { outreachId, recruiterId, scheduledDate, subject, body } = req.body;

    if (!outreachId || !recruiterId || !scheduledDate) {
      res.status(400).json({ success: false, message: 'outreachId, recruiterId and scheduledDate are required.' });
      return;
    }

    const followUp = await FollowUp.create({
      outreachId,
      recruiterId,
      scheduledDate: new Date(scheduledDate),
      subject: subject || 'Follow-up regarding C2C candidate',
      body: body || 'Hi, checking in on my previous email to see if you had any questions.',
      status: 'PENDING'
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (err) {
    next(err);
  }
};

export const updateFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const followUp = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!followUp) {
      res.status(404).json({ success: false, message: 'Follow-up not found.' });
      return;
    }
    res.json({ success: true, data: followUp });
  } catch (err) {
    next(err);
  }
};

export const deleteFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const followUp = await FollowUp.findByIdAndDelete(req.params.id);
    if (!followUp) {
      res.status(404).json({ success: false, message: 'Follow-up not found.' });
      return;
    }
    res.json({ success: true, message: 'Follow-up deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

export const triggerProcessDue = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await processDueFollowUps();
    res.json({
      success: true,
      message: `Follow-up processor executed: ${result.processed} sent, ${result.cancelled} cancelled.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
