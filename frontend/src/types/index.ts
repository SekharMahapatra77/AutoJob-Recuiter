export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type JobStatus = 'NEW' | 'REVIEWING' | 'QUALIFIED' | 'DISQUALIFIED' | 'OUTREACH_READY' | 'CONTACTED' | 'CLOSED';
export type JobSource = 'LINKEDIN' | 'CSV' | 'MANUAL' | 'OTHER';
export type C2CStatus = 'YES' | 'NO' | 'UNKNOWN';

export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  employmentType: string;
  c2cStatus: C2CStatus;
  c2cVerified: boolean;
  c2cVerificationSource: string;
  isUSA: boolean;
  source: JobSource;
  sourceUrl: string;
  recruiterId?: any;
  status: JobStatus;
  salary?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface Recruiter {
  _id: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  location: string;
  phone: string;
  source: string;
  verified: boolean;
  notes: string;
  status: RecruiterStatus;
  optedOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  primarySkills: string[];
  yearsOfExperience: number;
  preferredRoles: string[];
  preferredEmploymentType: string;
  portfolio: string;
  github: string;
  linkedin: string;
  summary: string;
}

export interface Resume {
  _id: string;
  candidateId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  parsedText: string;
  extractedSkills: string[];
  type: 'MASTER' | 'CUSTOMIZED';
  isPrimary: boolean;
  version: number;
  source: string;
  targetJobId?: any;
  matchScore?: number;
  tailoredSummary?: string;
  createdAt: string;
}

export interface Campaign {
  _id: string;
  name: string;
  description: string;
  targetTechnology: string;
  targetLocation: string;
  c2cOnly: boolean;
  startDate: string;
  endDate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  stats?: {
    totalLeads: number;
    emailsSent: number;
    replies: number;
    positiveReplies: number;
    conversionRate: number;
  };
  createdAt: string;
}

export interface Outreach {
  _id: string;
  recruiterId: any;
  jobId?: any;
  candidateId?: any;
  campaignId?: any;
  recipientEmail: string;
  subject: string;
  body: string;
  attachmentId?: any;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'REPLIED' | 'BOUNCED' | 'FAILED' | 'COMPLETED';
  sentAt?: string;
  messageId?: string;
  threadId?: string;
  followUpCount: number;
  nextFollowUpAt?: string;
  createdAt: string;
}

export interface FollowUp {
  _id: string;
  outreachId: any;
  recruiterId: any;
  sequenceNumber: number;
  scheduledDate: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'SKIPPED';
  subject: string;
  body: string;
  sentAt?: string;
  notes?: string;
  createdAt: string;
}

export type ReplyCategory =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'REQUEST_FOR_INFORMATION'
  | 'INTERVIEW'
  | 'OUT_OF_OFFICE'
  | 'UNKNOWN';

export interface Reply {
  _id: string;
  recruiterId: any;
  outreachId?: any;
  messageId: string;
  threadId?: string;
  sender: string;
  subject: string;
  body: string;
  category: ReplyCategory;
  confidence: number;
  receivedAt: string;
  processed: boolean;
  notes?: string;
}

export interface DuplicateLog {
  _id: string;
  recruiterEmail: string;
  recruiterId?: any;
  jobId?: any;
  campaignId?: any;
  attemptedAt: string;
  reason: string;
  action: string;
}

export interface Activity {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  userId?: any;
  createdAt: string;
}
