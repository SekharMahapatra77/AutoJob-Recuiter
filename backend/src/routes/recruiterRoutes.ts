import { Router } from 'express';
import {
  getRecruiters,
  getRecruiterById,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter
} from '../controllers/recruiterController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getRecruiters);
router.get('/:id', getRecruiterById);
router.post('/', createRecruiter);
router.put('/:id', updateRecruiter);
router.delete('/:id', deleteRecruiter);

export default router;
