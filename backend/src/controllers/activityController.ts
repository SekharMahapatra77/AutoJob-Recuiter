import { Request, Response, NextFunction } from 'express';
import { Activity } from '../models/Activity';

export const getActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = '20' } = req.query;
    const limitNum = parseInt(String(limit), 10) || 20;

    const activities = await Activity.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};
