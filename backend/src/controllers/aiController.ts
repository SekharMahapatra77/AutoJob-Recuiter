import { Request, Response, NextFunction } from 'express';
import { Resume } from '../models/Resume';
import { Job } from '../models/Job';
import { Recruiter } from '../models/Recruiter';
import { Candidate } from '../models/Candidate';
import { aiService } from '../services/ai/aiProvider';
import { AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from '../services/activityLogger';
import fs from 'fs';
import path from 'path';

export const analyzeResumeMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resumeId, jobId } = req.body;

    if (!resumeId || !jobId) {
      res.status(400).json({ success: false, message: 'Both resumeId and jobId are required.' });
      return;
    }

    const [resume, job] = await Promise.all([
      Resume.findById(resumeId),
      Job.findById(jobId)
    ]);

    if (!resume) {
      res.status(404).json({ success: false, message: 'Resume not found.' });
      return;
    }

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    const candidate = await Candidate.findById(resume.candidateId);
    const analysis = await aiService.analyzeMatch(
      resume.parsedText,
      `${job.title} ${job.description} ${job.skills.join(' ')}`,
      candidate?.primarySkills || resume.extractedSkills || []
    );

    // Update job and resume match cache if appropriate
    await logActivity(
      'AI_ANALYSIS_GENERATED',
      'Job',
      job._id.toString(),
      `Analyzed match between resume "${resume.fileName}" and job "${job.title}": Match score ${analysis.matchScore}%`,
      req.user?.id
    );

    res.json({
      success: true,
      data: {
        analysis,
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          c2cStatus: job.c2cStatus,
          isUSA: job.isUSA
        },
        resume: {
          id: resume._id,
          fileName: resume.fileName,
          version: resume.version
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const generateCustomizedResume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resumeId, jobId, saveAsVersion = true } = req.body;

    if (!resumeId || !jobId) {
      res.status(400).json({ success: false, message: 'Both resumeId and jobId are required.' });
      return;
    }

    const [resume, job] = await Promise.all([
      Resume.findById(resumeId),
      Job.findById(jobId)
    ]);

    if (!resume || !job) {
      res.status(404).json({ success: false, message: 'Resume or Job not found.' });
      return;
    }

    const candidate = await Candidate.findById(resume.candidateId);
    const customized = await aiService.generateCustomizedResume(
      resume.parsedText,
      `${job.title} ${job.description} ${job.skills.join(' ')}`,
      candidate
    );

    let createdResumeRecord = null;

    if (saveAsVersion) {
      const uploadBase = path.join(process.cwd(), 'uploads', 'resumes');
      if (!fs.existsSync(uploadBase)) fs.mkdirSync(uploadBase, { recursive: true });

      const customizedFileName = `customized_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
      const customizedFilePath = path.join(uploadBase, customizedFileName);
      fs.writeFileSync(customizedFilePath, customized.customizedResumeText, 'utf-8');

      const count = await Resume.countDocuments({ candidateId: resume.candidateId });

      createdResumeRecord = await Resume.create({
        candidateId: resume.candidateId,
        fileName: `${job.company} - Tailored C2C Resume.txt`,
        filePath: customizedFilePath,
        fileSize: Buffer.byteLength(customized.customizedResumeText),
        parsedText: customized.customizedResumeText,
        extractedSkills: customized.emphasizedSkills,
        type: 'CUSTOMIZED',
        isPrimary: false,
        version: count + 1,
        source: 'AI_CUSTOMIZATION',
        targetJobId: job._id,
        tailoredSummary: customized.tailoredSummary
      });

      await logActivity(
        'RESUME_CUSTOMIZED',
        'Resume',
        createdResumeRecord._id.toString(),
        `Generated customized resume version #${createdResumeRecord.version} for ${job.company}`,
        req.user?.id
      );
    }

    res.json({
      success: true,
      data: {
        originalText: resume.parsedText,
        customized,
        savedResume: createdResumeRecord
      }
    });
  } catch (err) {
    next(err);
  }
};

export const generateOutreachEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId, recruiterId, candidateId } = req.body;

    const [job, recruiter, candidate] = await Promise.all([
      jobId ? Job.findById(jobId) : null,
      recruiterId ? Recruiter.findById(recruiterId) : null,
      candidateId ? Candidate.findById(candidateId) : Candidate.findOne({ userId: req.user?.id })
    ]);

    const email = await aiService.generateOutreachEmail(candidate, recruiter, job);

    res.json({
      success: true,
      data: email
    });
  } catch (err) {
    next(err);
  }
};

export const classifyReplyManual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { body, subject = '' } = req.body;
    if (!body) {
      res.status(400).json({ success: false, message: 'Email body is required.' });
      return;
    }

    const classification = await aiService.classifyReply(body, subject);
    res.json({ success: true, data: classification });
  } catch (err) {
    next(err);
  }
};
