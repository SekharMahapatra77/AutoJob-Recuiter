import { Request, Response, NextFunction } from 'express';
import { Settings } from '../models/Settings';
import { gmailService } from '../services/gmail/gmailService';
import { imapService } from '../services/imap/imapService';

export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await Settings.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await Settings.create({ key: 'global_config' });
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

export const getGmailAuthUrl = (req: Request, res: Response): void => {
  try {
    const url = gmailService.getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Google OAuth Client ID/Secret not configured yet in .env.' });
  }
};

export const handleGmailCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, message: 'Authorization code is required.' });
      return;
    }

    const result = await gmailService.handleCallback(code);
    res.json({ success: true, message: 'Gmail connected successfully.', data: result });
  } catch (err) {
    next(err);
  }
};

export const disconnectGmail = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await gmailService.disconnect();
    res.json({ success: true, message: 'Gmail disconnected.' });
  } catch (err) {
    next(err);
  }
};

export const updateIntegrationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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
      { key: 'global_config' },
      updates,
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Settings saved successfully.', data: updated });
  } catch (err) {
    next(err);
  }
};

export const testImap = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await imapService.syncInbox();
    res.json({
      success: true,
      message: `IMAP connection verified. Found ${result.checked} unseen messages.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
