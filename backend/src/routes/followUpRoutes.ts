import { Router } from 'express';
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  triggerProcessDue
} from '../controllers/followUpController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getFollowUps);
router.post('/', createFollowUp);
router.post('/process-due', triggerProcessDue);
router.put('/:id', updateFollowUp);
router.delete('/:id', deleteFollowUp);

export default router;
