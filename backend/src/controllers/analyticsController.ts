import { Request, Response, NextFunction } from 'express';
import { Job } from '../models/Job';
import { Recruiter } from '../models/Recruiter';
import { Outreach } from '../models/Outreach';
import { Reply } from '../models/Reply';
import { FollowUp } from '../models/FollowUp';

export const getDashboardMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalJobs,
      qualifiedC2CJobs,
      totalRecruiters,
      emailsSent,
      repliesCount,
      positiveRepliesCount,
      followUpsDue,
      interestedLeads
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ isUSA: true, c2cStatus: 'YES' }),
      Recruiter.countDocuments(),
      Outreach.countDocuments({ status: { $in: ['SENT', 'DELIVERED', 'REPLIED'] } }),
      Reply.countDocuments(),
      Reply.countDocuments({ category: { $in: ['INTERESTED', 'INTERVIEW'] } }),
      FollowUp.countDocuments({ status: 'PENDING', scheduledDate: { $lte: new Date() } }),
      Recruiter.countDocuments({ status: 'INTERESTED' })
    ]);

    const replyRate = emailsSent > 0 ? Math.round((repliesCount / emailsSent) * 100) : 0;
    const positiveRate = repliesCount > 0 ? Math.round((positiveRepliesCount / repliesCount) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalJobs,
        qualifiedC2CJobs,
        totalRecruiters,
        emailsSent,
        repliesCount,
        positiveRepliesCount,
        followUpsDue,
        interestedLeads,
        replyRate,
        positiveRate
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getDetailedAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Outreach Trend (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const outreachTrend = await Outreach.aggregate([
      { $match: { sentAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          sent: { $sum: 1 },
          replied: { $sum: { $cond: [{ $eq: ['$status', 'REPLIED'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Job Status Distribution
    const jobStatusDistribution = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. C2C Distribution
    const c2cDistribution = await Job.aggregate([
      { $group: { _id: '$c2cStatus', count: { $sum: 1 } } }
    ]);

    // 4. Job Source Distribution
    const sourceDistribution = await Job.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    // 5. Reply Category Distribution
    const replyCategories = await Reply.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // 6. Technology In-Demand Distribution
    const techDistribution = await Job.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // 7. Funnel metrics
    const totalLeads = await Outreach.countDocuments();
    const sentCount = await Outreach.countDocuments({ status: { $in: ['SENT', 'DELIVERED', 'REPLIED'] } });
    const repliedCount = await Reply.countDocuments();
    const positiveCount = await Reply.countDocuments({ category: { $in: ['INTERESTED', 'INTERVIEW'] } });

    const funnel = [
      { stage: 'Total Targets', count: totalLeads },
      { stage: 'Emails Sent', count: sentCount },
      { stage: 'Replies Received', count: repliedCount },
      { stage: 'Interested / Interviews', count: positiveCount }
    ];

    res.json({
      success: true,
      data: {
        outreachTrend,
        jobStatusDistribution,
        c2cDistribution,
        sourceDistribution,
        replyCategories,
        techDistribution,
        funnel
      }
    });
  } catch (err) {
    next(err);
  }
};
