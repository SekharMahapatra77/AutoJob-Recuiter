import { Request, Response, NextFunction } from 'express';
import { Recruiter } from '../models/Recruiter';
import { logActivity } from '../services/activityLogger';
import { AuthenticatedRequest } from '../middleware/auth';

export const getRecruiters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      keyword,
      company,
      status,
      verified,
      page = '1',
      limit = '10'
    } = req.query;

    const filter: Record<string, any> = {};

    if (keyword) {
      const term = String(keyword).trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
        { jobTitle: { $regex: term, $options: 'i' } }
      ];
    }

    if (company) {
      filter.company = { $regex: String(company).trim(), $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (verified !== undefined && verified !== '') {
      filter.verified = verified === 'true';
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [recruiters, total] = await Promise.all([
      Recruiter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Recruiter.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        recruiters,
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

export const getRecruiterById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) {
      res.status(404).json({ success: false, message: 'Recruiter not found.' });
      return;
    }
    res.json({ success: true, data: recruiter });
  } catch (err) {
    next(err);
  }
};

export const createRecruiter = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      email,
      company,
      jobTitle = 'Technical Recruiter',
      linkedinUrl = '',
      location = 'USA',
      phone = '',
      source = 'MANUAL',
      verified = false,
      notes = '',
      status = 'NEW'
    } = req.body;

    if (!name || !email || !company) {
      res.status(400).json({ success: false, message: 'Name, email, and company are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate
    const existing = await Recruiter.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `A recruiter with email ${normalizedEmail} already exists (${existing.name} at ${existing.company}).`,
        code: 'DUPLICATE_RECRUITER'
      });
      return;
    }

    const recruiter = await Recruiter.create({
      name: name.trim(),
      email: normalizedEmail,
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      linkedinUrl: linkedinUrl.trim(),
      location: location.trim(),
      phone: phone.trim(),
      source,
      verified,
      notes,
      status
    });

    await logActivity(
      'RECRUITER_CREATED',
      'Recruiter',
      recruiter._id.toString(),
      `Added recruiter ${recruiter.name} from ${recruiter.company}`,
      req.user?.id
    );

    res.status(201).json({ success: true, data: recruiter });
  } catch (err) {
    next(err);
  }
};

export const updateRecruiter = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = { ...req.body };
    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }

    const recruiter = await Recruiter.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!recruiter) {
      res.status(404).json({ success: false, message: 'Recruiter not found.' });
      return;
    }

    res.json({ success: true, data: recruiter });
  } catch (err) {
    next(err);
  }
};

export const deleteRecruiter = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recruiter = await Recruiter.findByIdAndDelete(req.params.id);
    if (!recruiter) {
      res.status(404).json({ success: false, message: 'Recruiter not found.' });
      return;
    }
    res.json({ success: true, message: 'Recruiter deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
