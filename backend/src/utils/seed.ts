import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { User } from '../models/User';
import { Candidate } from '../models/Candidate';
import { Job } from '../models/Job';
import { Recruiter } from '../models/Recruiter';
import { Resume } from '../models/Resume';
import { Campaign } from '../models/Campaign';
import { Outreach } from '../models/Outreach';
import { FollowUp } from '../models/FollowUp';
import { Reply } from '../models/Reply';
import { DuplicateLog } from '../models/DuplicateLog';
import { Activity } from '../models/Activity';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/c2c_outreach_platform';

const sampleResumeContent = `ALEX MORGAN
Dallas, TX | alex.morgan.dev@email.com | (214) 555-0192 | linkedin.com/in/alexmorgandev

SENIOR FULL STACK & BACKEND ARCHITECT (C2C CONSULTANT)
Versatile Principal Software Consultant with 7+ years of hands-on experience architecting high-throughput distributed microservices, robust REST/GraphQL APIs, and mission-critical cloud platforms. Immediate availability for Corp-to-Corp (C2C) contractual engagements.

CORE TECHNICAL SKILLS
• Languages: TypeScript, JavaScript (ES6+), Python, SQL, HTML5/CSS3
• Backend: Node.js, Express.js, NestJS, REST APIs, GraphQL, Microservices, Event-Driven Systems
• Databases & Cache: MongoDB, PostgreSQL, Redis, DynamoDB
• Cloud & DevOps: AWS (Lambda, ECS, S3, RDS, SQS, CloudWatch), Docker, Kubernetes, CI/CD Pipelines (GitHub Actions)
• Testing & Practices: Jest, Mocha, Agile/Scrum, Corp-to-Corp Compliance

PROFESSIONAL EXPERIENCE

Principal Backend Consultant | CloudScale Solutions LLC (Dallas, TX) | 2021 – Present
• Architected enterprise-grade Node.js / TypeScript microservices processing over 15M daily transactions.
• Optimized MongoDB database aggregation queries, reducing P99 latency from 450ms to 42ms.
• Designed and integrated OAuth 2.0 and JWT authentication systems across multi-tenant applications.
• Led cloud infrastructure modernization using AWS ECS, Docker containers, and automated CI/CD workflows.

Senior Software Engineer | Apex Digital Systems (Austin, TX) | 2018 – 2021
• Built core API gateways and customer-facing dashboards utilizing React, Node.js, and Express.js.
• Integrated third-party messaging queues with Redis and AWS SQS for resilient async job processing.
• Mentored 6 software engineers on code quality, clean architecture, and automated testing with Jest.

EDUCATION
Bachelor of Science in Computer Science | University of Texas at Dallas`;

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected.');

    // Clean existing seed collections
    console.log('[Seed] Clearing previous collections...');
    await Promise.all([
      User.deleteMany({}),
      Candidate.deleteMany({}),
      Job.deleteMany({}),
      Recruiter.deleteMany({}),
      Resume.deleteMany({}),
      Campaign.deleteMany({}),
      Outreach.deleteMany({}),
      FollowUp.deleteMany({}),
      Reply.deleteMany({}),
      DuplicateLog.deleteMany({}),
      Activity.deleteMany({})
    ]);

    // 1. Create Admin User
    console.log('[Seed] Creating Admin User...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const adminUser = await User.create({
      name: 'Sarah Connor (Admin)',
      email: 'admin@c2coutreach.com',
      passwordHash,
      role: 'ADMIN'
    });

    // 2. Create Candidate Profile
    console.log('[Seed] Creating Candidate Profile...');
    const candidate = await Candidate.create({
      userId: adminUser._id,
      name: 'Alex Morgan',
      email: 'alex.morgan.c2c@gmail.com',
      phone: '+1 (214) 555-0192',
      location: 'Dallas, TX (Remote US)',
      primarySkills: ['Node.js', 'TypeScript', 'React', 'MongoDB', 'AWS', 'Docker', 'REST API', 'Redis'],
      yearsOfExperience: 7,
      preferredRoles: [
        'Senior Node.js Developer',
        'Lead Backend Consultant',
        'Full Stack C2C Engineer'
      ],
      preferredEmploymentType: 'C2C',
      portfolio: 'https://alexmorgan.dev',
      github: 'https://github.com/alexmorgan-dev',
      linkedin: 'https://linkedin.com/in/alexmorgandev',
      summary: 'Senior full-stack C2C contractor with 7+ years of experience in enterprise distributed architectures.'
    });

    // 3. Create Master Resume
    console.log('[Seed] Creating Master Resume File...');
    const resumeDir = path.join(process.cwd(), 'uploads', 'resumes');
    if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

    const masterResumePath = path.join(resumeDir, 'Alex_Morgan_Master_Resume.txt');
    fs.writeFileSync(masterResumePath, sampleResumeContent, 'utf-8');

    const masterResume = await Resume.create({
      candidateId: candidate._id,
      fileName: 'Alex_Morgan_Master_Resume.txt',
      filePath: masterResumePath,
      fileSize: Buffer.byteLength(sampleResumeContent),
      parsedText: sampleResumeContent,
      extractedSkills: ['Node.js', 'TypeScript', 'React', 'MongoDB', 'AWS', 'Docker', 'Redis', 'Jest', 'REST API', 'GraphQL'],
      type: 'MASTER',
      isPrimary: true,
      version: 1,
      source: 'SEED'
    });

    // 4. Create Sample Recruiters (8 recruiters)
    console.log('[Seed] Creating Sample Recruiters...');
    const recruiters = await Recruiter.insertMany([
      {
        name: 'David Miller',
        email: 'david.miller@techcorpstaffing.com',
        company: 'TechCorp Solutions',
        jobTitle: 'Lead IT Recruiter',
        location: 'New York, NY',
        phone: '+1 (212) 555-0143',
        linkedinUrl: 'https://linkedin.com/in/david-miller-tech',
        source: 'MANUAL',
        verified: true,
        status: 'READY',
        notes: 'Specializes in C2C fintech contracts'
      },
      {
        name: 'Jessica Vance',
        email: 'jvance@apexsystemsrecruiting.com',
        company: 'Apex Staffing Partners',
        jobTitle: 'Senior Talent Acquisition',
        location: 'Austin, TX',
        phone: '+1 (512) 555-0182',
        linkedinUrl: 'https://linkedin.com/in/jessica-vance-apex',
        source: 'LINKEDIN',
        verified: true,
        status: 'INTERESTED',
        notes: 'Looking for immediate Corp-to-Corp backend engineers'
      },
      {
        name: 'Robert Chen',
        email: 'rchen@cybercoders-talent.com',
        company: 'CyberCoders Talent',
        jobTitle: 'Technical Recruiter',
        location: 'San Jose, CA',
        phone: '+1 (408) 555-0199',
        linkedinUrl: 'https://linkedin.com/in/robert-chen-tech',
        source: 'MANUAL',
        verified: true,
        status: 'CONTACTED',
        notes: 'Has multiple Node.js/AWS contracts'
      },
      {
        name: 'Amanda Brooks',
        email: 'abrooks@insightglobal-c2c.com',
        company: 'Insight Staffing Group',
        jobTitle: 'Principal Account Executive',
        location: 'Atlanta, GA',
        phone: '+1 (404) 555-0122',
        linkedinUrl: 'https://linkedin.com/in/amanda-brooks-talent',
        source: 'CSV',
        verified: true,
        status: 'REPLIED',
        notes: 'Requested rate confirmation for healthcare client'
      },
      {
        name: 'Michael Scott',
        email: 'mscott@scrantontech.com',
        company: 'Scranton Tech Recruiting',
        jobTitle: 'Branch Manager',
        location: 'Scranton, PA',
        phone: '+1 (570) 555-0177',
        linkedinUrl: 'https://linkedin.com/in/mscott-tech',
        source: 'MANUAL',
        verified: false,
        status: 'NEW',
        notes: 'Initial contact lead'
      },
      {
        name: 'Priya Sharma',
        email: 'psharma@ustalentforce.com',
        company: 'US TalentForce Global',
        jobTitle: 'C2C Delivery Lead',
        location: 'Chicago, IL',
        phone: '+1 (312) 555-0138',
        linkedinUrl: 'https://linkedin.com/in/priya-sharma-talent',
        source: 'LINKEDIN',
        verified: true,
        status: 'READY',
        notes: 'High volume C2C supplier for Tier-1 banks'
      },
      {
        name: 'Marcus Brody',
        email: 'mbrody@brodystaffing.com',
        company: 'Brody Tech Partners',
        jobTitle: 'Director of Recruiting',
        location: 'Denver, CO',
        phone: '+1 (303) 555-0191',
        linkedinUrl: 'https://linkedin.com/in/marcus-brody-tech',
        source: 'CSV',
        verified: true,
        status: 'NOT_INTERESTED',
        notes: 'Only works W2 roles currently'
      },
      {
        name: 'Elena Rostova',
        email: 'erostova@nexustechstaff.com',
        company: 'Nexus Tech Staffing',
        jobTitle: 'Senior Tech Recruiter',
        location: 'Seattle, WA',
        phone: '+1 (206) 555-0149',
        linkedinUrl: 'https://linkedin.com/in/elena-rostova-nexus',
        source: 'MANUAL',
        verified: true,
        status: 'FOLLOW_UP',
        notes: 'Awaiting client feedback on rate'
      }
    ]);

    // 5. Create Sample Jobs (5 jobs)
    console.log('[Seed] Creating Sample Jobs...');
    const jobs = await Job.insertMany([
      {
        title: 'Senior Node.js / TypeScript Engineer (C2C)',
        company: 'Apex Staffing Partners',
        location: 'Remote, US',
        description: `We are seeking an experienced Senior Node.js / TypeScript Consultant for a 12-month Corp-to-Corp (C2C) engagement with our premier enterprise client.
Responsibilities:
• Architect scalable microservices using Node.js, Express, and TypeScript.
• Build and maintain high-performance MongoDB and PostgreSQL databases.
• Deploy services to AWS ECS and manage Docker containers.
Requirements:
• 6+ years of production experience in Node.js and TypeScript.
• Corp to Corp (C2C) entity with valid US business registration.
• Strong background in REST APIs and distributed caching with Redis.`,
        skills: ['Node.js', 'TypeScript', 'Express.js', 'MongoDB', 'AWS', 'Docker', 'Redis', 'REST API'],
        employmentType: 'C2C',
        c2cStatus: 'YES',
        c2cVerified: true,
        c2cVerificationSource: 'AUTOMATIC_DETECTION',
        isUSA: true,
        source: 'LINKEDIN',
        sourceUrl: 'https://www.linkedin.com/jobs/view/1001',
        recruiterId: recruiters[1]._id,
        status: 'QUALIFIED',
        salary: '$80 - $95 / hr C2C',
        createdBy: adminUser._id
      },
      {
        title: 'Full Stack Engineer (React & Node.js)',
        company: 'TechCorp Solutions',
        location: 'New York, NY (Hybrid)',
        description: `Open for C2C or 1099 consultants. Looking for a full stack engineer proficient in modern React, Node.js REST services, and cloud integrations. 6 months rolling contract.`,
        skills: ['React', 'Node.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Docker'],
        employmentType: 'Contract',
        c2cStatus: 'YES',
        c2cVerified: true,
        c2cVerificationSource: 'MANUAL_VERIFICATION',
        isUSA: true,
        source: 'MANUAL',
        sourceUrl: 'https://techcorpstaffing.com/jobs/node-react',
        recruiterId: recruiters[0]._id,
        status: 'OUTREACH_READY',
        salary: '$85 / hr C2C',
        createdBy: adminUser._id
      },
      {
        title: 'Lead Cloud Backend Architect',
        company: 'CyberCoders Talent',
        location: 'San Jose, CA (Remote)',
        description: `Seeking a senior cloud architect. Must have strong hands-on AWS, Kubernetes, and microservices experience. Corp-to-Corp candidates welcome.`,
        skills: ['AWS', 'Kubernetes', 'Docker', 'Node.js', 'Microservices', 'Terraform'],
        employmentType: 'C2C',
        c2cStatus: 'YES',
        c2cVerified: true,
        c2cVerificationSource: 'AUTOMATIC_DETECTION',
        isUSA: true,
        source: 'LINKEDIN',
        sourceUrl: 'https://www.linkedin.com/jobs/view/1003',
        recruiterId: recruiters[2]._id,
        status: 'CONTACTED',
        salary: '$100 - $110 / hr C2C',
        createdBy: adminUser._id
      },
      {
        title: 'Enterprise Java / Spring Boot Engineer',
        company: 'US TalentForce Global',
        location: 'Chicago, IL',
        description: `Contract role for Java backend engineer. Terms: W2 only, no third parties or C2C permitted.`,
        skills: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'AWS'],
        employmentType: 'Contract (W2 Only)',
        c2cStatus: 'NO',
        c2cVerified: true,
        c2cVerificationSource: 'AUTOMATIC_DETECTION',
        isUSA: true,
        source: 'CSV',
        sourceUrl: 'https://ustalentforce.com/jobs/java-442',
        recruiterId: recruiters[5]._id,
        status: 'DISQUALIFIED',
        salary: '$70 / hr W2',
        createdBy: adminUser._id
      },
      {
        title: 'Senior Software Developer (Consultant)',
        company: 'Nexus Tech Staffing',
        location: 'Seattle, WA',
        description: `Contract consulting role for high growth startup. Need someone with strong backend skills and database modeling. Compensation based on experience.`,
        skills: ['Node.js', 'Python', 'PostgreSQL', 'Docker', 'Git'],
        employmentType: 'Contract',
        c2cStatus: 'UNKNOWN',
        c2cVerified: false,
        c2cVerificationSource: 'SYSTEM_DETECTION',
        isUSA: true,
        source: 'MANUAL',
        sourceUrl: '',
        recruiterId: recruiters[7]._id,
        status: 'REVIEWING',
        salary: 'Open',
        createdBy: adminUser._id
      }
    ]);

    // 6. Create Campaigns (2 campaigns)
    console.log('[Seed] Creating Campaigns...');
    const campaigns = await Campaign.insertMany([
      {
        name: 'Q3 Enterprise Node.js & C2C Outreach',
        description: 'Targeted outreach to recruiters with open C2C requirements in Node.js, TypeScript, and AWS cloud roles.',
        targetTechnology: 'Node.js',
        targetLocation: 'United States',
        c2cOnly: true,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdBy: adminUser._id
      },
      {
        name: 'FinTech Cloud Microservices Blitz',
        description: 'Targeting East Coast and Texas banking/fintech staffing firms for lead consulting opportunities.',
        targetTechnology: 'AWS & Microservices',
        targetLocation: 'USA',
        c2cOnly: true,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdBy: adminUser._id
      }
    ]);

    // 7. Create Sample Outreach Records
    console.log('[Seed] Creating Outreach Records...');
    const outreach1 = await Outreach.create({
      recruiterId: recruiters[1]._id, // Jessica Vance
      jobId: jobs[0]._id,
      candidateId: candidate._id,
      campaignId: campaigns[0]._id,
      recipientEmail: recruiters[1].email,
      subject: 'C2C Senior Consultant for Senior Node.js / TypeScript Engineer - Alex Morgan',
      body: `Hi Jessica,\n\nI noticed your open Senior Node.js / TypeScript Engineer role with Apex Staffing Partners and wanted to reach out regarding immediate Corp-to-Corp (C2C) placement.\n\nI bring 7+ years of hands-on production experience architecting high-throughput microservices using Node.js, TypeScript, and AWS. I have attached my resume for your review.\n\nBest regards,\nAlex Morgan`,
      attachmentId: masterResume._id,
      status: 'REPLIED',
      sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      messageId: '<outreach-1-seed@c2c.local>',
      threadId: 'thread-jessica-101',
      followUpCount: 1,
      sendMethod: 'GMAIL_OAUTH'
    });

    const outreach2 = await Outreach.create({
      recruiterId: recruiters[3]._id, // Amanda Brooks
      jobId: jobs[1]._id,
      candidateId: candidate._id,
      campaignId: campaigns[0]._id,
      recipientEmail: recruiters[3].email,
      subject: 'C2C Senior Consultant for Full Stack Engineer - Alex Morgan',
      body: `Hi Amanda,\n\nReaching out regarding your open Full Stack Engineer role. I am an incorporated senior consultant available immediately on C2C with strong React and Node.js skills.\n\nThanks,\nAlex Morgan`,
      attachmentId: masterResume._id,
      status: 'REPLIED',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      messageId: '<outreach-2-seed@c2c.local>',
      threadId: 'thread-amanda-102',
      followUpCount: 0,
      sendMethod: 'GMAIL_OAUTH'
    });

    const outreach3 = await Outreach.create({
      recruiterId: recruiters[2]._id, // Robert Chen
      jobId: jobs[2]._id,
      candidateId: candidate._id,
      campaignId: campaigns[1]._id,
      recipientEmail: recruiters[2].email,
      subject: 'C2C Senior Consultant for Lead Cloud Backend Architect - Alex Morgan',
      body: `Hi Robert,\n\nI saw your posting for the Lead Cloud Backend Architect role. With deep background in AWS microservices and Node.js, I would love to connect for a quick 5-min chat.\n\nBest,\nAlex Morgan`,
      attachmentId: masterResume._id,
      status: 'SENT',
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      messageId: '<outreach-3-seed@c2c.local>',
      threadId: 'thread-robert-103',
      followUpCount: 0,
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      sendMethod: 'GMAIL_OAUTH'
    });

    // 8. Create Sample Replies
    console.log('[Seed] Creating Sample Replies...');
    await Reply.create({
      recruiterId: recruiters[1]._id,
      outreachId: outreach1._id,
      messageId: '<reply-1-seed@apexsystems.com>',
      threadId: 'thread-jessica-101',
      sender: recruiters[1].email,
      subject: 'Re: C2C Senior Consultant for Senior Node.js / TypeScript Engineer - Alex Morgan',
      body: `Hi Alex,\n\nThanks for reaching out! Your profile looks like a great fit for our client. What is your expected hourly C2C rate, and when would you be available for a brief introductory interview with our account manager?\n\nBest,\nJessica Vance`,
      category: 'INTERESTED',
      confidence: 0.94,
      receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      processed: true,
      notes: 'Recruiter inquired about rate and proposed interview'
    });

    await Reply.create({
      recruiterId: recruiters[3]._id,
      outreachId: outreach2._id,
      messageId: '<reply-2-seed@insightglobal.com>',
      threadId: 'thread-amanda-102',
      sender: recruiters[3].email,
      subject: 'Re: C2C Senior Consultant for Full Stack Engineer - Alex Morgan',
      body: `Hi Alex,\n\nCould you please send over your employer's certificate of insurance and state incorporation details? We would like to submit you to the client today.\n\nThanks,\nAmanda`,
      category: 'REQUEST_FOR_INFORMATION',
      confidence: 0.88,
      receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      processed: true,
      notes: 'Recruiter requesting C2C documentation'
    });

    // 9. Create Sample Follow-up Records
    console.log('[Seed] Creating Follow-ups...');
    await FollowUp.create({
      outreachId: outreach3._id,
      recruiterId: recruiters[2]._id,
      sequenceNumber: 1,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      subject: 'Following up on C2C opportunity',
      body: 'Hi Robert, just following up on my previous note to check if your team is actively interviewing C2C candidates for this role.'
    });

    // 10. Create Sample Duplicate Logs
    console.log('[Seed] Creating Duplicate Logs...');
    await DuplicateLog.create({
      recruiterEmail: recruiters[1].email,
      recruiterId: recruiters[1]._id,
      jobId: jobs[0]._id,
      campaignId: campaigns[0]._id,
      attemptedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      reason: `DUPLICATE_OUTREACH: Recipient ${recruiters[1].email} has already been contacted for this job.`,
      action: 'BLOCKED'
    });

    // 11. Create Sample Activities
    console.log('[Seed] Creating Activity Logs...');
    await Activity.insertMany([
      {
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: jobs[0]._id.toString(),
        details: 'Created job "Senior Node.js / TypeScript Engineer" (USA, C2C: YES)',
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        action: 'RESUME_UPLOADED',
        entityType: 'Resume',
        entityId: masterResume._id.toString(),
        details: 'Uploaded master resume "Alex_Morgan_Master_Resume.txt" with 10 extracted skills',
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      },
      {
        action: 'EMAIL_SENT',
        entityType: 'Outreach',
        entityId: outreach1._id.toString(),
        details: `Sent initial C2C outreach to ${recruiters[1].email}`,
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        action: 'REPLY_RECEIVED',
        entityType: 'Reply',
        entityId: recruiters[1]._id.toString(),
        details: `Received reply from ${recruiters[1].name} classified as [INTERESTED] (Confidence: 94%)`,
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        action: 'DUPLICATE_BLOCKED',
        entityType: 'Outreach',
        entityId: '',
        details: `Blocked duplicate outreach to ${recruiters[1].email}`,
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ]);

    console.log('[Seed] Database seeding completed successfully!');
    console.log('[Seed] Admin login: admin@c2coutreach.com | Password123!');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
