import { Router } from 'express';
import {
  getSettings,
  getGmailAuthUrl,
  handleGmailCallbackLanding,
  handleGmailCallback,
  disconnectGmail,
  updateIntegrationSettings,
  testImap
} from '../controllers/settingsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public callback landing for Google OAuth browser redirect
router.get('/gmail/callback', handleGmailCallbackLanding);

// Authenticated routes
router.use(authenticateJWT);

router.get('/', getSettings);
router.get('/gmail/auth-url', getGmailAuthUrl);
router.post('/gmail/callback', handleGmailCallback);
router.post('/gmail/disconnect', disconnectGmail);
router.put('/integrations', updateIntegrationSettings);
router.post('/imap/test', testImap);

export default router;
