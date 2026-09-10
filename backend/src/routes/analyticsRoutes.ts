import { Router } from 'express';
import { getDashboardMetrics, getDetailedAnalytics } from '../controllers/analyticsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/metrics', getDashboardMetrics);
router.get('/detailed', getDetailedAnalytics);

export default router;
