import { Request, Response, NextFunction } from 'express';
import { Candidate } from '../models/Candidate';
import { AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from '../services/activityLogger';

export const getCurrentCandidate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let candidate = await Candidate.findOne({ userId: req.user?.id });

    if (!candidate) {
      // Create default if not found
      candidate = await Candidate.create({
        userId: req.user?.id,
        name: req.user?.name || 'Senior Consultant',
        email: req.user?.email || 'consultant@example.com',
        primarySkills: ['Node.js', 'TypeScript', 'React', 'MongoDB', 'REST API', 'AWS'],
        yearsOfExperience: 6,
        preferredRoles: ['Senior Full Stack Engineer', 'Lead Backend Engineer', 'C2C Consultant'],
        preferredEmploymentType: 'C2C',
        location: 'United States'
      });
    }

    res.json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

export const updateCurrentCandidate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = { ...req.body };

    if (updates.primarySkills && !Array.isArray(updates.primarySkills)) {
      updates.primarySkills = updates.primarySkills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (updates.preferredRoles && !Array.isArray(updates.preferredRoles)) {
      updates.preferredRoles = updates.preferredRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    let candidate = await Candidate.findOneAndUpdate(
      { userId: req.user?.id },
      updates,
      { new: true, upsert: true }
    );

    await logActivity(
      'CANDIDATE_UPDATED',
      'Candidate',
      candidate._id.toString(),
      `Updated candidate profile for ${candidate.name}`,
      req.user?.id
    );

    res.json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

export const getCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.json({ success: true, data: candidates });
  } catch (err) {
    next(err);
  }
};
