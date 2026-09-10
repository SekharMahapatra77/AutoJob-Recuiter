import cron from 'node-cron';
import { processDueFollowUps } from '../services/outreach/followUpService';
import { imapService } from '../services/imap/imapService';

export const initScheduler = (): void => {
  console.log('[Scheduler] Initializing background jobs runner...');

  // 1. Check due follow-ups every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const { processed, cancelled } = await processDueFollowUps();
      if (processed > 0 || cancelled > 0) {
        console.log(`[Scheduler] Follow-up cycle completed: ${processed} sent, ${cancelled} cancelled.`);
      }
    } catch (err: any) {
      console.error('[Scheduler] Error processing due follow-ups:', err.message);
    }
  });

  // 2. Poll IMAP inbox every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      const { checked, imported } = await imapService.syncInbox();
      if (imported > 0) {
        console.log(`[Scheduler] IMAP inbox polled: ${checked} checked, ${imported} new replies imported.`);
      }
    } catch (err: any) {
      console.error('[Scheduler] Error polling IMAP inbox:', err.message);
    }
  });
};
