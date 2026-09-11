import mongoose from 'mongoose';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { Recruiter } from '../../models/Recruiter';
import { Outreach } from '../../models/Outreach';
import { Reply } from '../../models/Reply';
import { Settings } from '../../models/Settings';
import { aiService } from '../ai/aiProvider';
import { gmailService } from '../gmail/gmailService';
import { stopFollowUpsForRecruiter } from '../outreach/followUpService';
import { logActivity } from '../activityLogger';

export class IMAPService {
  async processIncomingEmail(
    senderEmail: string,
    subject: string,
    body: string,
    messageId: string,
    threadId?: string
  ): Promise<any> {
    const normalizedSender = senderEmail.trim().toLowerCase();

    // 1. Prevent duplicate reply creation
    const existing = await Reply.findOne({ messageId });
    if (existing) {
      return { duplicate: true, replyId: existing._id };
    }

    // 2. Match recruiter by email
    const recruiter = await Recruiter.findOne({ email: normalizedSender });
    if (!recruiter) {
      console.log(`[IMAP] Received message from unknown sender: ${normalizedSender}. Skipping outreach match.`);
      return null;
    }

    // 3. Match outreach record
    const outreach = await Outreach.findOne({
      recruiterId: recruiter._id,
      status: { $in: ['SENT', 'DELIVERED', 'SCHEDULED', 'SENDING'] }
    }).sort({ sentAt: -1 });

    // 4. Classify reply using AI
    const classification = await aiService.classifyReply(body, subject);

    // 5. Create Reply record
    const reply = await Reply.create({
      recruiterId: recruiter._id,
      outreachId: outreach?._id,
      messageId,
      threadId,
      sender: normalizedSender,
      subject,
      body,
      category: classification.category,
      confidence: classification.confidence,
      receivedAt: new Date(),
      processed: true,
      notes: classification.reasoning
    });

    // 6. Update Outreach status
    if (outreach) {
      await Outreach.findByIdAndUpdate(outreach._id, {
        status: 'REPLIED',
        nextFollowUpAt: null
      });
    }

    // 7. Update Recruiter status based on reply intent
    let recruiterStatus = 'REPLIED' as const;
    if (classification.category === 'INTERESTED' || classification.category === 'INTERVIEW') {
      recruiterStatus = 'INTERESTED' as any;
    } else if (classification.category === 'NOT_INTERESTED') {
      recruiterStatus = 'NOT_INTERESTED' as any;
    }

    await Recruiter.findByIdAndUpdate(recruiter._id, { status: recruiterStatus });

    // 8. Automatically STOP all pending follow-ups for this recruiter
    await stopFollowUpsForRecruiter(
      recruiter._id.toString(),
      `Reply received classified as ${classification.category}`
    );

    // 9. Record Activity log
    await logActivity(
      'REPLY_RECEIVED',
      'Reply',
      reply._id.toString(),
      `Received reply from ${recruiter.name} (${recruiter.email}) - Classified as [${classification.category}] with ${Math.round(classification.confidence * 100)}% confidence`
    );

    return reply;
  }

  async syncInbox(userId?: string): Promise<{ checked: number; imported: number }> {
    // 1. Prioritize Gmail OAuth synchronization (preferred, secure, no passwords required)
    let settings = null;
    if (userId) {
      settings = await Settings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }

    if (settings?.gmailConnected && settings?.gmailTokens?.access_token) {
      return await gmailService.syncGmailReplies(userId);
    }

    // If userId was not passed (e.g. background cron runner), check all connected Gmail OAuth accounts first
    if (!userId) {
      const gmailCount = await Settings.countDocuments({
        gmailConnected: true,
        'gmailTokens.access_token': { $exists: true }
      });
      if (gmailCount > 0) {
        return await gmailService.syncGmailReplies();
      }
    }

    // 2. Fall back to legacy IMAP credentials if configured in settings or .env
    const host = settings?.imapHost || process.env.IMAP_HOST;
    const user = settings?.imapUser || process.env.IMAP_USER;
    const password = settings?.imapPassword || process.env.IMAP_PASSWORD;
    const port = settings?.imapPort || Number(process.env.IMAP_PORT) || 993;
    const tls = settings?.imapTls !== undefined ? settings.imapTls : true;

    if (!user || !password) {
      console.log('[IMAP] IMAP credentials not configured in settings or environment. Skipping network sync.');
      return { checked: 0, imported: 0 };
    }

    const config: any = {
      imap: {
        user,
        password,
        host,
        port,
        tls,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    try {
      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], struct: true };

      const messages = await connection.search(searchCriteria, fetchOptions);
      let imported = 0;

      for (const message of messages) {
        const all = message.parts.find((p: any) => p.which === '');
        if (!all) continue;

        const parsed = await simpleParser(all.body);
        const sender = parsed.from?.value[0]?.address || '';
        const subject = parsed.subject || 'No Subject';
        const body = parsed.text || parsed.html || '';
        const messageId = parsed.messageId || `imap-${message.attributes.uid}`;

        const reply = await this.processIncomingEmail(
          sender,
          subject,
          typeof body === 'string' ? body : '',
          messageId
        );

        if (reply && !reply.duplicate) {
          imported++;
        }
      }

      await connection.end();
      return { checked: messages.length, imported };
    } catch (err: any) {
      console.warn('[IMAP Sync Error]', err.message);
      return { checked: 0, imported: 0 };
    }
  }
}

export const imapService = new IMAPService();
