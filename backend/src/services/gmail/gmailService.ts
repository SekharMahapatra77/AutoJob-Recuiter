import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { Settings } from '../../models/Settings';

export class GmailService {
  private getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/settings/gmail/callback';

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(): string {
    const oauth2Client = this.getOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
  }

  async handleCallback(code: string): Promise<{ email: string }> {
    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'connected@gmail.com';

    await Settings.findOneAndUpdate(
      { key: 'global_config' },
      {
        gmailConnected: true,
        gmailEmail: email,
        gmailTokens: tokens
      },
      { upsert: true, new: true }
    );

    return { email };
  }

  async getConnectionStatus(): Promise<{ connected: boolean; email?: string }> {
    const settings = await Settings.findOne({ key: 'global_config' });
    return {
      connected: Boolean(settings?.gmailConnected),
      email: settings?.gmailEmail || undefined
    };
  }

  async disconnect(): Promise<void> {
    await Settings.findOneAndUpdate(
      { key: 'global_config' },
      {
        gmailConnected: false,
        gmailEmail: '',
        gmailTokens: null
      }
    );
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    attachmentPath?: string;
    attachmentName?: string;
  }): Promise<{ messageId: string; threadId?: string; method: 'GMAIL_OAUTH' | 'SMTP' | 'SIMULATED' }> {
    const settings = await Settings.findOne({ key: 'global_config' });

    // 1. Try Gmail OAuth if tokens exist
    if (settings?.gmailConnected && settings?.gmailTokens?.access_token) {
      try {
        const oauth2Client = this.getOAuthClient();
        oauth2Client.setCredentials(settings.gmailTokens);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build RFC 2822 email
        const boundary = `__boundary_${Date.now()}__`;
        let rawMessage = [
          `To: ${options.to}`,
          `Subject: ${options.subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          options.body,
          ''
        ];

        if (options.attachmentPath && fs.existsSync(options.attachmentPath)) {
          const fileData = fs.readFileSync(options.attachmentPath).toString('base64');
          const fileName = options.attachmentName || path.basename(options.attachmentPath);
          rawMessage.push(
            `--${boundary}`,
            `Content-Type: application/octet-stream; name="${fileName}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${fileName}"`,
            '',
            fileData,
            ''
          );
        }

        rawMessage.push(`--${boundary}--`);

        const encodedMessage = Buffer.from(rawMessage.join('\r\n'))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedMessage }
        });

        return {
          messageId: res.data.id || `gmail-${Date.now()}`,
          threadId: res.data.threadId || undefined,
          method: 'GMAIL_OAUTH'
        };
      } catch (err: any) {
        console.warn('[Gmail OAuth Send Error] Falling back to SMTP/simulated:', err.message);
      }
    }

    // 2. Try SMTP if configured in .env
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const attachments = (options.attachmentPath && fs.existsSync(options.attachmentPath))
          ? [{ path: options.attachmentPath, filename: options.attachmentName || 'Resume.pdf' }]
          : [];

        const info = await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: options.to,
          subject: options.subject,
          text: options.body,
          attachments
        });

        return {
          messageId: info.messageId,
          method: 'SMTP'
        };
      } catch (smtpErr: any) {
        console.warn('[SMTP Send Error] Falling back to simulated delivery:', smtpErr.message);
      }
    }

    // 3. Fallback to reliable development simulation (ensures full end-to-end testing without external network blockers)
    const simulatedMessageId = `<c2c-outreach-${Date.now()}-${Math.round(Math.random() * 10000)}@outreach.local>`;
    console.log(`[Email Service Simulated] Sent to: ${options.to} | Subject: "${options.subject}"`);

    return {
      messageId: simulatedMessageId,
      threadId: `thread-${Date.now()}`,
      method: 'SIMULATED' as const
    };
  }
}

export const gmailService = new GmailService();
