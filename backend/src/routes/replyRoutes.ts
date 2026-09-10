import { Router } from 'express';
import {
  getReplies,
  getReplyById,
  updateReplyCategory,
  simulateIncomingReply,
  syncImapNow
} from '../controllers/replyController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getReplies);
router.get('/:id', getReplyById);
router.put('/:id/category', updateReplyCategory);
router.post('/simulate', simulateIncomingReply);
router.post('/sync-imap', syncImapNow);

export default router;
