export type UserRole = 'ADMIN' | 'USER';

export type JobStatus = 'NEW' | 'REVIEWING' | 'QUALIFIED' | 'DISQUALIFIED' | 'OUTREACH_READY' | 'CONTACTED' | 'CLOSED';
export type JobSource = 'LINKEDIN' | 'CSV' | 'MANUAL' | 'OTHER';
export type C2CStatus = 'YES' | 'NO' | 'UNKNOWN';

export type RecruiterStatus = 
  | 'NEW'
  | 'VERIFIED'
  | 'READY'
  | 'CONTACTED'
  | 'FOLLOW_UP'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CLOSED';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type OutreachStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'REPLIED'
  | 'BOUNCED'
  | 'FAILED'
  | 'COMPLETED';

export type FollowUpStatus = 'PENDING' | 'SENT' | 'CANCELLED' | 'SKIPPED';

export type ReplyCategory =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'REQUEST_FOR_INFORMATION'
  | 'INTERVIEW'
  | 'OUT_OF_OFFICE'
  | 'UNKNOWN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
