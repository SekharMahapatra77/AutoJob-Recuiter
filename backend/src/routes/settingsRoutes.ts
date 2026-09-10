import { Router } from 'express';
import {
  getSettings,
  getGmailAuthUrl,
  handleGmailCallback,
  disconnectGmail,
  updateIntegrationSettings,
  testImap
} from '../controllers/settingsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.get('/gmail/auth-url', getGmailAuthUrl);
router.post('/gmail/callback', handleGmailCallback);
router.post('/gmail/disconnect', disconnectGmail);
router.put('/integrations', updateIntegrationSettings);
router.post('/imap/test', testImap);

export default router;
