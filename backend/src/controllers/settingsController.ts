import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Settings } from '../models/Settings';
import { gmailService } from '../services/gmail/gmailService';
import { imapService } from '../services/imap/imapService';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    let settings = await Settings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!settings) {
      settings = await Settings.create({ userId: new mongoose.Types.ObjectId(userId) });
    }

    res.json({
      success: true,
      data: {
        gmailConnected: Boolean(settings.gmailConnected),
        gmailEmail: settings.gmailEmail || '',
        imapHost: settings.imapHost || process.env.IMAP_HOST || 'imap.gmail.com',
        imapPort: settings.imapPort || Number(process.env.IMAP_PORT) || 993,
        imapUser: settings.imapUser || process.env.IMAP_USER || '',
        imapTls: settings.imapTls !== undefined ? settings.imapTls : true,
        aiProvider: settings.aiProvider || process.env.AI_PROVIDER || 'openai',
        aiBaseUrl: settings.aiBaseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        aiModel: settings.aiModel || process.env.AI_MODEL || 'gpt-4o-mini',
        hasAiKey: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.length > 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getGmailAuthUrl = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const url = await gmailService.getAuthUrl(userId);
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Google OAuth Client ID/Secret not configured yet in .env.'
    });
  }
};

/**
 * Public browser landing redirect for Google OAuth.
 * Google redirects the user's browser here via GET with query params code & state.
 * This endpoint transmits code and state back to the frontend app via postMessage (popup)
 * or redirect (full-page), so the frontend can submit them authenticated via POST.
 */
export const handleGmailCallbackLanding = (req: Request, res: Response): void => {
  const { code, state, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  // Generate a cryptographically secure CSP nonce for this callback response
  const nonce = crypto.randomBytes(16).toString('base64');

  // Set Content-Security-Policy allowing the generated nonce for inline script execution
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'`
  );

  // Apply unsafe-none strictly to this popup landing response so the opener reference is preserved
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  const safeCode = typeof code === 'string' ? JSON.stringify(code) : 'null';
  const safeState = typeof state === 'string' ? JSON.stringify(state) : 'null';
  const safeError = typeof error === 'string' ? JSON.stringify(error) : 'null';
  const safeClientUrl = JSON.stringify(clientUrl);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting Gmail...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <h3>Authenticating with Gmail...</h3>
    <p>Please wait while we complete authorization.</p>
  </div>
  <script nonce="${nonce}">
    (function() {
      var code = ${safeCode};
      var state = ${safeState};
      var error = ${safeError};
      var clientUrl = ${safeClientUrl};
      var targetOrigin = '*';
      try {
        targetOrigin = new URL(clientUrl).origin;
      } catch (e) {
        targetOrigin = clientUrl;
      }

      var messageSent = false;

      try {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'GMAIL_AUTH_CALLBACK',
              code: code,
              state: state,
              error: error
            },
            targetOrigin
          );

          messageSent = true;

          setTimeout(function () {
            window.close();
          }, 300);
        }
      } catch (err) {
        console.warn('OAuth popup communication failed');
      }

      if (!messageSent) {
        var target = new URL('/settings', clientUrl);
        if (error) target.searchParams.set('error', error);
        window.location.href = target.toString();
      }
    })();
  </script>
</body>
</html>`;

  res.send(html);
};

export const handleGmailCallback = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, state } = req.body;
    if (!code || !state) {
      res.status(400).json({ success: false, message: 'Authorization code and state are required.' });
      return;
    }

    const userId = req.user!.id;
    const result = await gmailService.handleCallback(userId, code, state);
    res.json({
      success: true,
      message: 'Gmail connected successfully.',
      data: {
        connected: true,
        email: result.email
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to connect Gmail account.' });
  }
};

export const disconnectGmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    await gmailService.disconnect(userId);
    res.json({ success: true, message: 'Gmail disconnected.' });
  } catch (err) {
    next(err);
  }
};

export const updateIntegrationSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { imapHost, imapPort, imapUser, imapPassword, imapTls, aiProvider, aiBaseUrl, aiModel } = req.body;

    const updates: Record<string, any> = {};
    if (imapHost !== undefined) updates.imapHost = imapHost;
    if (imapPort !== undefined) updates.imapPort = Number(imapPort);
    if (imapUser !== undefined) updates.imapUser = imapUser;
    if (imapPassword !== undefined && imapPassword !== '') updates.imapPassword = imapPassword;
    if (imapTls !== undefined) updates.imapTls = imapTls;
    if (aiProvider !== undefined) updates.aiProvider = aiProvider;
    if (aiBaseUrl !== undefined) updates.aiBaseUrl = aiBaseUrl;
    if (aiModel !== undefined) updates.aiModel = aiModel;

    const updated = await Settings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: updates,
        $setOnInsert: { userId: new mongoose.Types.ObjectId(userId) }
      },
      { new: true, upsert: true }
    );

    // Return safe data without secrets
    res.json({
      success: true,
      message: 'Settings saved successfully.',
      data: {
        gmailConnected: Boolean(updated.gmailConnected),
        gmailEmail: updated.gmailEmail || '',
        imapHost: updated.imapHost,
        imapPort: updated.imapPort,
        imapUser: updated.imapUser,
        imapTls: updated.imapTls,
        aiProvider: updated.aiProvider,
        aiBaseUrl: updated.aiBaseUrl,
        aiModel: updated.aiModel
      }
    });
  } catch (err) {
    next(err);
  }
};

export const testImap = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await imapService.syncInbox(userId);
    res.json({
      success: true,
      message: `IMAP connection verified. Found ${result.checked} unseen messages.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
