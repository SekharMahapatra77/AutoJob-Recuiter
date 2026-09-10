import { Router } from 'express';
import { getCurrentCandidate, updateCurrentCandidate, getCandidates } from '../controllers/candidateController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/current', getCurrentCandidate);
router.put('/current', updateCurrentCandidate);
router.get('/', getCandidates);

export default router;
