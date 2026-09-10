import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Candidate } from '../models/Candidate';
import { AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from '../services/activityLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_c2c_outreach_jwt_secret_key_2026';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER'
    });

    // Automatically create linked Candidate profile if it doesn't exist
    const candidate = await Candidate.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      primarySkills: ['Node.js', 'TypeScript', 'React', 'MongoDB', 'REST API', 'AWS'],
      yearsOfExperience: 6,
      preferredRoles: ['Senior Full Stack Engineer', 'Senior Backend Engineer', 'C2C Lead Consultant'],
      preferredEmploymentType: 'C2C'
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logActivity('USER_REGISTERED', 'User', user._id.toString(), `User ${user.email} registered`, user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        candidateId: candidate._id
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const candidate = await Candidate.findOne({ userId: user._id });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        candidateId: candidate?._id
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const candidate = await Candidate.findOne({ userId: user._id });

    res.json({
      success: true,
      data: {
        user,
        candidateId: candidate?._id
      }
    });
  } catch (err) {
    next(err);
  }
};
