import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { Resume } from '../models/Resume';
import { Candidate } from '../models/Candidate';
import { parseResumeFile } from '../services/resumeParser';
import { AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from '../services/activityLogger';

export const uploadResumeFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No resume file uploaded.' });
      return;
    }

    const candidate = await Candidate.findOne({ userId: req.user?.id });
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate profile not found.' });
      return;
    }

    // Parse resume file text and extract skills
    const { text, skills } = await parseResumeFile(req.file.path);

    // If candidate has no primary skills yet, populate with extracted skills
    if (candidate.primarySkills.length === 0 && skills.length > 0) {
      candidate.primarySkills = skills.slice(0, 8);
      await candidate.save();
    }

    // Check if candidate already has a primary resume
    const existingPrimary = await Resume.findOne({ candidateId: candidate._id, isPrimary: true });
    const isPrimary = !existingPrimary;

    // Determine version number
    const count = await Resume.countDocuments({ candidateId: candidate._id, type: 'MASTER' });

    const resume = await Resume.create({
      candidateId: candidate._id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      parsedText: text,
      extractedSkills: skills,
      type: 'MASTER',
      isPrimary,
      version: count + 1,
      source: 'UPLOAD'
    });

    await logActivity(
      'RESUME_UPLOADED',
      'Resume',
      resume._id.toString(),
      `Uploaded resume "${resume.fileName}" with ${skills.length} extracted skills`,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      data: resume
    });
  } catch (err) {
    next(err);
  }
};

export const getResumes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user?.id });
    if (!candidate) {
      res.json({ success: true, data: [] });
      return;
    }

    const resumes = await Resume.find({ candidateId: candidate._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: resumes });
  } catch (err) {
    next(err);
  }
};

export const getResumeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      res.status(404).json({ success: false, message: 'Resume not found.' });
      return;
    }
    res.json({ success: true, data: resume });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      res.status(404).json({ success: false, message: 'Resume not found.' });
      return;
    }

    // Unset all primary for this candidate
    await Resume.updateMany({ candidateId: resume.candidateId }, { isPrimary: false });

    resume.isPrimary = true;
    await resume.save();

    res.json({ success: true, data: resume });
  } catch (err) {
    next(err);
  }
};

export const downloadResumeFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || !fs.existsSync(resume.filePath)) {
      res.status(404).json({ success: false, message: 'Resume file not found on disk.' });
      return;
    }

    res.download(resume.filePath, resume.fileName);
  } catch (err) {
    next(err);
  }
};

export const deleteResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      res.status(404).json({ success: false, message: 'Resume not found.' });
      return;
    }

    if (fs.existsSync(resume.filePath)) {
      try {
        fs.unlinkSync(resume.filePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e);
      }
    }

    await Resume.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Resume deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
