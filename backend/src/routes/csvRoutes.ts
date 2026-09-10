import { Router } from 'express';
import { previewCsv, importCsv, exportCsv } from '../controllers/csvController';
import { authenticateJWT } from '../middleware/auth';
import { uploadCsv } from '../middleware/upload';

const router = Router();

router.use(authenticateJWT);

router.post('/preview', uploadCsv.single('file'), previewCsv);
router.post('/import', importCsv);
router.get('/export', exportCsv);

export default router;
