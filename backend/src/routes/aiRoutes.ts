import { Router } from 'express';
import {
  analyzeResumeMatch,
  generateCustomizedResume,
  generateOutreachEmail,
  classifyReplyManual
} from '../controllers/aiController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/analyze-match', analyzeResumeMatch);
router.post('/customize-resume', generateCustomizedResume);
router.post('/generate-email', generateOutreachEmail);
router.post('/classify-reply', classifyReplyManual);

export default router;
