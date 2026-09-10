import { Router } from 'express';
import { getActivities } from '../controllers/activityController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getActivities);

export default router;
