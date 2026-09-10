import { Router } from 'express';
import {
  getOutreachList,
  checkDuplicate,
  sendOutreach,
  saveDraft,
  getDuplicateLogs
} from '../controllers/outreachController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getOutreachList);
router.post('/check-duplicate', checkDuplicate);
router.post('/send', sendOutreach);
router.post('/draft', saveDraft);
router.get('/duplicate-logs', getDuplicateLogs);

export default router;
