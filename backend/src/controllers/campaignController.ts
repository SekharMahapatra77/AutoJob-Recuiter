import { Request, Response, NextFunction } from 'express';
import { Campaign } from '../models/Campaign';
import { Outreach } from '../models/Outreach';
import { Reply } from '../models/Reply';
import { AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from '../services/activityLogger';

export const getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });

    // Aggregate stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (c) => {
        const [totalOutreach, sentCount, repliedCount, positiveReplyCount] = await Promise.all([
          Outreach.countDocuments({ campaignId: c._id }),
          Outreach.countDocuments({ campaignId: c._id, status: { $in: ['SENT', 'DELIVERED', 'REPLIED'] } }),
          Outreach.countDocuments({ campaignId: c._id, status: 'REPLIED' }),
          Reply.countDocuments({
            outreachId: { $in: await Outreach.find({ campaignId: c._id }).distinct('_id') },
            category: { $in: ['INTERESTED', 'INTERVIEW'] }
          })
        ]);

        const conversionRate = sentCount > 0 ? Math.round((positiveReplyCount / sentCount) * 100) : 0;

        return {
          ...c.toObject(),
          stats: {
            totalLeads: totalOutreach,
            emailsSent: sentCount,
            replies: repliedCount,
            positiveReplies: positiveReplyCount,
            conversionRate
          }
        };
      })
    );

    res.json({ success: true, data: campaignsWithStats });
  } catch (err) {
    next(err);
  }
};

export const getCampaignById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }

    const outreachList = await Outreach.find({ campaignId: campaign._id })
      .populate('recruiterId', 'name email company')
      .populate('jobId', 'title company location')
      .sort({ createdAt: -1 });

    const sentCount = outreachList.filter(o => ['SENT', 'DELIVERED', 'REPLIED'].includes(o.status)).length;
    const repliedCount = outreachList.filter(o => o.status === 'REPLIED').length;

    res.json({
      success: true,
      data: {
        campaign,
        outreachList,
        stats: {
          totalLeads: outreachList.length,
          sentCount,
          repliedCount,
          replyRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createCampaign = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description = '', targetTechnology = '', targetLocation = 'USA', c2cOnly = true, startDate, endDate, status = 'ACTIVE' } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Campaign name is required.' });
      return;
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      description,
      targetTechnology,
      targetLocation,
      c2cOnly,
      startDate: startDate || new Date(),
      endDate: endDate || undefined,
      status,
      createdBy: req.user?.id
    });

    await logActivity(
      'CAMPAIGN_CREATED',
      'Campaign',
      campaign._id.toString(),
      `Created outreach campaign "${campaign.name}" [Target: ${targetTechnology || 'General'}]`,
      req.user?.id
    );

    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

export const updateCampaign = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

export const deleteCampaign = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }
    res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
