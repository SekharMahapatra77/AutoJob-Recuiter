import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Settings, ISettings } from '../../models/Settings';
import { OAuthState } from '../../models/OAuthState';
import { Reply } from '../../models/Reply';
import { Recruiter } from '../../models/Recruiter';
import { Outreach } from '../../models/Outreach';
import { aiService } from '../ai/aiProvider';
import { stopFollowUpsForRecruiter } from '../outreach/followUpService';
import { logActivity } from '../activityLogger';

function extractCleanEmail(fromHeader: string): string {
  if (!fromHeader) return '';
  const match = fromHeader.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return fromHeader.trim().toLowerCase();
}

function extractGmailBody(payload: any): string {
  if (!payload) return '';

  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, 'base64url').toString('utf8');
    } catch {
      return Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plainPart?.body?.data) {
      try {
        return Buffer.from(plainPart.body.data, 'base64url').toString('utf8');
      } catch {
        return Buffer.from(plainPart.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      }
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractGmailBody(part);
        if (nested) return nested;
      }
    }

    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      try {
        const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf8');
        return html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {}
    }
  }

  return payload.snippet || '';
}

export class GmailService {
  private getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/settings/gmail/callback';

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  async getAuthUrl(userId: string): Promise<string> {
    const oauth2Client = this.getOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL
    await OAuthState.create({
      state,
      userId: new mongoose.Types.ObjectId(userId),
      expiresAt
    });

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state
    });
  }

  async handleCallback(userId: string, code: string, state: string): Promise<{ email: string }> {
    if (!code || !state) {
      throw new Error('Authorization code and state are required.');
    }

    // Atomic validate & consume state
    const oauthState = await OAuthState.findOneAndDelete({
      state,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!oauthState) {
      throw new Error('Invalid, expired, or already-used OAuth state.');
    }

    if (oauthState.expiresAt < new Date()) {
      throw new Error('OAuth state has expired.');
    }

    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'connected@gmail.com';

    await Settings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(userId),
          gmailConnected: true,
          gmailEmail: email,
          gmailTokens: tokens
        }
      },
      { upsert: true, new: true }
    );

    return { email };
  }

  async getConnectionStatus(userId: string): Promise<{ connected: boolean; email?: string }> {
    const settings = await Settings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    return {
      connected: Boolean(settings?.gmailConnected),
      email: settings?.gmailEmail || undefined
    };
  }

  async disconnect(userId: string): Promise<void> {
    await Settings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          gmailConnected: false,
          gmailEmail: '',
          gmailTokens: null
        }
      }
    );
  }

  async sendEmail(
    userId: string | undefined,
    options: {
      to: string;
      subject: string;
      body: string;
      attachmentPath?: string;
      attachmentName?: string;
    }
  ): Promise<{ messageId: string; threadId?: string; method: 'GMAIL_OAUTH' | 'SMTP' | 'SIMULATED' }> {
    let settings: ISettings | null = null;
    if (userId) {
      settings = await Settings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }

    // 1. Try Gmail OAuth if tokens exist for this user
    if (settings?.gmailConnected && settings?.gmailTokens?.access_token) {
      try {
        const oauth2Client = this.getOAuthClient();
        oauth2Client.setCredentials(settings.gmailTokens);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build RFC 2822 email
        const boundary = `__boundary_${Date.now()}__`;
        const rawMessage = [
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

  async syncGmailReplies(userId?: string): Promise<{ checked: number; imported: number }> {
    console.log('[REPLY SYNC] Checking Gmail...');
    let settingsList: ISettings[] = [];

    if (userId) {
      const s = await Settings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (s && s.gmailConnected && s.gmailTokens?.access_token) {
        settingsList.push(s);
      }
    } else {
      settingsList = await Settings.find({
        gmailConnected: true,
        'gmailTokens.access_token': { $exists: true }
      });
    }

    if (settingsList.length === 0) {
      console.log('[REPLY SYNC] No active Gmail OAuth connection found to sync.');
      return { checked: 0, imported: 0 };
    }

    let totalChecked = 0;
    let totalImported = 0;

    for (const settings of settingsList) {
      try {
        const oauth2Client = this.getOAuthClient();
        oauth2Client.setCredentials(settings.gmailTokens!);

        // Persist refreshed tokens automatically
        oauth2Client.on('tokens', async (tokens) => {
          if (tokens.access_token) {
            await Settings.findOneAndUpdate(
              { userId: settings.userId },
              {
                $set: {
                  'gmailTokens.access_token': tokens.access_token,
                  ...(tokens.refresh_token && { 'gmailTokens.refresh_token': tokens.refresh_token }),
                  ...(tokens.expiry_date && { 'gmailTokens.expiry_date': tokens.expiry_date })
                }
              }
            );
          }
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 30,
          q: 'in:inbox'
        });

        const messages = listRes.data.messages || [];
        console.log(`[REPLY SYNC] Found ${messages.length} inbox messages to inspect for user ${settings.gmailEmail || settings.userId}.`);

        for (const msgRef of messages) {
          if (!msgRef.id) continue;

          // 1. Check if already stored by messageId or threadId
          const alreadyImported = await Reply.findOne({
            $or: [
              { messageId: msgRef.id },
              { messageId: `gmail-${msgRef.id}` }
            ]
          });

          if (alreadyImported) {
            totalChecked++;
            continue;
          }

          // 2. Fetch full message details from Gmail
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: msgRef.id,
            format: 'full'
          });

          totalChecked++;

          const headers = msg.data.payload?.headers || [];
          const getHeader = (name: string) => {
            const h = headers.find(hdr => hdr.name?.toLowerCase() === name.toLowerCase());
            return h?.value || '';
          };

          const fromHeader = getHeader('From');
          const subject = getHeader('Subject') || 'No Subject';
          const rfcMessageId = getHeader('Message-ID') || msgRef.id;
          const dateHeader = getHeader('Date');
          const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

          const senderEmail = extractCleanEmail(fromHeader);

          // Skip self-sent emails from the connected account
          const connectedUserEmail = (settings.gmailEmail || '').trim().toLowerCase();
          if (connectedUserEmail && senderEmail === connectedUserEmail) {
            continue;
          }

          // Check if RFC Message-ID was already stored
          if (rfcMessageId) {
            const existsRfc = await Reply.findOne({ messageId: rfcMessageId });
            if (existsRfc) continue;
          }

          const body = extractGmailBody(msg.data.payload);

          console.log(`[REPLY SYNC] Found new message from "${senderEmail}" (Subject: "${subject}")...`);

          // 3. Match recruiter by email
          let recruiter = await Recruiter.findOne({ email: senderEmail });
          if (!recruiter) {
            recruiter = await Recruiter.findOne({
              email: { $regex: new RegExp(`^${senderEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });
          }

          // 4. Match outreach by threadId
          let outreach = null;
          if (msg.data.threadId) {
            outreach = await Outreach.findOne({
              $or: [
                { threadId: msg.data.threadId },
                { messageId: msg.data.threadId }
              ]
            });
          }

          // Cross-resolve recruiter from outreach if not yet resolved
          if (outreach && !recruiter && outreach.recruiterId) {
            recruiter = await Recruiter.findById(outreach.recruiterId);
          }

          // Cross-resolve outreach from recruiter if not matched by threadId
          if (recruiter && !outreach) {
            outreach = await Outreach.findOne({
              recruiterId: recruiter._id,
              status: { $in: ['SENT', 'DELIVERED', 'SCHEDULED', 'SENDING', 'REPLIED'] }
            }).sort({ sentAt: -1 });
          }

          if (!recruiter) {
            console.log(`[REPLY SYNC] Message from unknown sender: ${senderEmail}. Skipping non-recruiter email.`);
            continue;
          }

          console.log(`[REPLY SYNC] Matched recruiter "${recruiter.name}" (${recruiter.email})...`);

          // 5. Classify reply using AI
          const classification = await aiService.classifyReply(body, subject);
          console.log(`[REPLY SYNC] AI classified reply as [${classification.category}] with ${Math.round(classification.confidence * 100)}% confidence.`);

          // 6. Create Reply record
          const reply = await Reply.create({
            recruiterId: recruiter._id,
            outreachId: outreach?._id,
            messageId: msgRef.id,
            threadId: msg.data.threadId,
            sender: senderEmail,
            subject,
            body,
            category: classification.category,
            confidence: classification.confidence,
            receivedAt,
            processed: true,
            notes: classification.reasoning
          });

          console.log(`[REPLY SYNC] Reply saved successfully.`);
          totalImported++;

          // 7. Update Outreach status
          if (outreach) {
            await Outreach.findByIdAndUpdate(outreach._id, {
              status: 'REPLIED',
              nextFollowUpAt: null
            });
          }

          // 8. Update Recruiter status based on reply category
          let recruiterStatus: any = 'REPLIED';
          if (classification.category === 'INTERESTED' || classification.category === 'INTERVIEW') {
            recruiterStatus = 'INTERESTED';
          } else if (classification.category === 'NOT_INTERESTED') {
            recruiterStatus = 'NOT_INTERESTED';
          }
          await Recruiter.findByIdAndUpdate(recruiter._id, { status: recruiterStatus });

          // 9. Stop further follow-ups for this recruiter
          await stopFollowUpsForRecruiter(
            recruiter._id.toString(),
            `Reply received classified as ${classification.category}`
          );

          // 10. Record Activity Log
          await logActivity(
            'REPLY_RECEIVED',
            'Reply',
            reply._id.toString(),
            `Received reply from ${recruiter.name} (${recruiter.email}) - Classified as [${classification.category}] with ${Math.round(classification.confidence * 100)}% confidence`
          );
        }
      } catch (userErr: any) {
        console.warn(`[REPLY SYNC] Error syncing Gmail for user ${settings.gmailEmail || settings.userId}:`, userErr.message);
      }
    }

    return { checked: totalChecked, imported: totalImported };
  }
}

export const gmailService = new GmailService();
