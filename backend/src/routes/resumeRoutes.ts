import { Router } from 'express';
import {
  uploadResumeFile,
  getResumes,
  getResumeById,
  setPrimaryResume,
  downloadResumeFile,
  deleteResume
} from '../controllers/resumeController';
import { authenticateJWT } from '../middleware/auth';
import { uploadResume } from '../middleware/upload';

const router = Router();

router.use(authenticateJWT);

router.post('/upload', uploadResume.single('resume'), uploadResumeFile);
router.get('/', getResumes);
router.get('/:id', getResumeById);
router.put('/:id/primary', setPrimaryResume);
router.get('/:id/download', downloadResumeFile);
router.delete('/:id', deleteResume);

export default router;
