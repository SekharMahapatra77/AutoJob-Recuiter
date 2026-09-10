import { Request, Response, NextFunction } from 'express';
import { Job } from '../models/Job';
import { isUSALocation } from '../services/usaFilter';
import { detectC2C } from '../services/c2cFilter';
import { logActivity } from '../services/activityLogger';
import { AuthenticatedRequest } from '../middleware/auth';

export const getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      keyword,
      location,
      isUSA,
      c2cStatus,
      status,
      technology,
      source,
      page = '1',
      limit = '10'
    } = req.query;

    const filter: Record<string, any> = {};

    if (keyword) {
      const term = String(keyword).trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { skills: { $in: [new RegExp(term, 'i')] } }
      ];
    }

    if (location) {
      filter.location = { $regex: String(location).trim(), $options: 'i' };
    }

    if (isUSA !== undefined && isUSA !== '') {
      filter.isUSA = isUSA === 'true';
    }

    if (c2cStatus) {
      filter.c2cStatus = c2cStatus;
    }

    if (status) {
      filter.status = status;
    }

    if (technology) {
      filter.skills = { $in: [new RegExp(String(technology).trim(), 'i')] };
    }

    if (source) {
      filter.source = source;
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('recruiterId', 'name email company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        jobs,
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

export const getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiterId');
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title,
      company,
      location = 'United States',
      description = '',
      skills = [],
      employmentType = 'C2C',
      source = 'MANUAL',
      sourceUrl = '',
      recruiterId,
      status = 'NEW',
      salary = '',
      notes = ''
    } = req.body;

    if (!title || !company) {
      res.status(400).json({ success: false, message: 'Title and company are required.' });
      return;
    }

    // Run USA detection
    const isUSA = isUSALocation(location);

    // Run C2C detection
    const c2cDetection = detectC2C(description, title, employmentType);
    const c2cStatus = req.body.c2cStatus || c2cDetection.c2cStatus;
    const c2cVerified = req.body.c2cVerified !== undefined ? req.body.c2cVerified : (c2cStatus === 'YES');
    const c2cVerificationSource = req.body.c2cVerificationSource || (c2cDetection.c2cStatus === 'YES' ? 'AUTOMATIC_DETECTION' : 'MANUAL_VERIFICATION');

    const job = await Job.create({
      title,
      company,
      location,
      description,
      skills: Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      employmentType,
      c2cStatus,
      c2cVerified,
      c2cVerificationSource,
      isUSA,
      source,
      sourceUrl,
      recruiterId: recruiterId || undefined,
      status,
      salary,
      notes,
      createdBy: req.user?.id
    });

    await logActivity(
      'JOB_CREATED',
      'Job',
      job._id.toString(),
      `Created job "${job.title}" at ${job.company} [C2C: ${job.c2cStatus}, USA: ${job.isUSA}]`,
      req.user?.id
    );

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = { ...req.body };

    if (updates.location !== undefined) {
      updates.isUSA = isUSALocation(updates.location);
    }

    if (updates.skills && !Array.isArray(updates.skills)) {
      updates.skills = updates.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }
    res.json({ success: true, message: 'Job deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
