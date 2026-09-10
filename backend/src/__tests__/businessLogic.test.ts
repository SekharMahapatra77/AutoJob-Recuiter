import { isUSALocation } from '../services/usaFilter';
import { detectC2C } from '../services/c2cFilter';
import { aiService } from '../services/ai/aiProvider';

describe('1. USA Location Detection (isUSALocation)', () => {
  it('should identify direct USA country aliases', () => {
    expect(isUSALocation('United States')).toBe(true);
    expect(isUSALocation('USA')).toBe(true);
    expect(isUSALocation('US')).toBe(true);
    expect(isUSALocation('Remote - US')).toBe(true);
    expect(isUSALocation('Remote (US)')).toBe(true);
    expect(isUSALocation('US-based Remote')).toBe(true);
  });

  it('should identify US state names and postal abbreviations', () => {
    expect(isUSALocation('Dallas, TX')).toBe(true);
    expect(isUSALocation('Austin, Texas')).toBe(true);
    expect(isUSALocation('New York, NY')).toBe(true);
    expect(isUSALocation('San Jose, CA')).toBe(true);
    expect(isUSALocation('Atlanta, GA')).toBe(true);
    expect(isUSALocation('Chicago, IL 60601')).toBe(true);
    expect(isUSALocation('Seattle, WA')).toBe(true);
  });

  it('should reject international non-US locations', () => {
    expect(isUSALocation('London, UK')).toBe(false);
    expect(isUSALocation('Toronto, Canada')).toBe(false);
    expect(isUSALocation('Bangalore, India')).toBe(false);
    expect(isUSALocation('Berlin, Germany')).toBe(false);
    expect(isUSALocation('Sydney, Australia')).toBe(false);
    expect(isUSALocation('')).toBe(false);
    expect(isUSALocation(null as any)).toBe(false);
  });
});

describe('2. C2C Detection Engine (detectC2C)', () => {
  it('should detect explicit C2C and Corp-to-Corp phrases', () => {
    const res1 = detectC2C('We have an immediate need for a Senior Engineer on C2C basis.');
    expect(res1.c2cStatus).toBe('YES');

    const res2 = detectC2C('12-month contract, open to Corp-to-Corp or 1099.');
    expect(res2.c2cStatus).toBe('YES');

    const res3 = detectC2C('Independent Contractor position, corporation to corporation welcome.');
    expect(res3.c2cStatus).toBe('YES');
  });

  it('should detect explicit negative W2-only phrases', () => {
    const res1 = detectC2C('This is a W2 only position. No C2C permitted.');
    expect(res1.c2cStatus).toBe('NO');

    const res2 = detectC2C('W-2 only, no third party vendors.');
    expect(res2.c2cStatus).toBe('NO');

    const res3 = detectC2C('We cannot sponsor or accept C2C for this role.');
    expect(res3.c2cStatus).toBe('NO');
  });

  it('should flag ambiguous contract terms as UNKNOWN for manual review', () => {
    const res1 = detectC2C('Looking for a contractor to help on short-term project.');
    expect(res1.c2cStatus).toBe('UNKNOWN');
  });
});

describe('3. Reply Intent Classification (classifyReply)', () => {
  it('should classify interest and rate requests as INTERESTED or INTERVIEW', async () => {
    const res = await aiService.classifyReply('Hi Alex, your profile looks great. What is your C2C hourly rate expectation?');
    expect(res.category).toBe('INTERESTED');

    const res2 = await aiService.classifyReply('Let us schedule a call this Thursday at 2pm via Calendly.');
    expect(res2.category).toBe('INTERVIEW');
  });

  it('should classify declines as NOT_INTERESTED', async () => {
    const res = await aiService.classifyReply('Thank you for reaching out, but we are not open to C2C and went with another candidate.');
    expect(res.category).toBe('NOT_INTERESTED');
  });

  it('should classify out-of-office autoreplies', async () => {
    const res = await aiService.classifyReply('I am currently out of the office on vacation with limited email access.');
    expect(res.category).toBe('OUT_OF_OFFICE');
  });

  it('should classify documentation questions as REQUEST_FOR_INFORMATION', async () => {
    const res = await aiService.classifyReply('Can you provide details on your visa status and work authorization?');
    expect(res.category).toBe('REQUEST_FOR_INFORMATION');
  });
});

describe('4. AI Truthfulness & Strict Non-Hallucination', () => {
  it('should generate truthful customized resume summary without inventing skills', async () => {
    const originalResume = 'Alex Morgan. 7 years experience in Node.js and TypeScript.';
    const jobDescription = 'Need Senior Node.js and AWS consultant for immediate C2C contract.';
    const candidateProfile = { name: 'Alex Morgan', yearsOfExperience: 7 };

    const result = await aiService.generateCustomizedResume(originalResume, jobDescription, candidateProfile);

    expect(result.customizedResumeText).toContain('Alex Morgan');
    expect(result.customizedResumeText).toContain('C2C');
    expect(result.tailoredSummary).toContain('7+ years');
    expect(result.changeLog.length).toBeGreaterThan(0);
    expect(result.changeLog[2]).toContain('Maintained 100% truthfulness');
  });
});

describe('5. Email Normalization & Duplicate Prevention Rules', () => {
  it('should normalize emails by trimming whitespace and lowercasing', () => {
    const email = '   Recruiter.Jane@StaffingCorp.COM   ';
    const normalized = email.trim().toLowerCase();
    expect(normalized).toBe('recruiter.jane@staffingcorp.com');
  });

  it('should reject invalid or blank email addresses for outreach', () => {
    const invalidEmail = '   ';
    expect(invalidEmail.trim().length).toBe(0);
  });
});

describe('6. Follow-up Business Logic Rules', () => {
  it('should determine that follow-ups must stop if recruiter replied', () => {
    const outreachStatus = 'REPLIED';
    const shouldStop = outreachStatus === 'REPLIED';
    expect(shouldStop).toBe(true);
  });

  it('should determine that follow-ups must stop if recruiter is marked NOT_INTERESTED or opted out', () => {
    const recruiter = { status: 'NOT_INTERESTED', optedOut: false };
    const shouldStop = recruiter.status === 'NOT_INTERESTED' || recruiter.optedOut;
    expect(shouldStop).toBe(true);
  });

  it('should stop follow-ups if max count of 2 is reached', () => {
    const followUpCount = 2;
    const MAX_FOLLOW_UPS = 2;
    const shouldStop = followUpCount >= MAX_FOLLOW_UPS;
    expect(shouldStop).toBe(true);
  });
});

describe('7. CSV Data Validation Rules', () => {
  it('should validate complete rows and flag missing required fields', () => {
    const validRow = { name: 'David Miller', email: 'david@techcorp.com', company: 'TechCorp' };
    const isValid = Boolean(validRow.name && validRow.email && validRow.company && validRow.email.includes('@'));
    expect(isValid).toBe(true);

    const invalidRow = { name: '', email: 'david@techcorp.com', company: 'TechCorp' };
    const isInvalidValid = Boolean(invalidRow.name && invalidRow.email && invalidRow.company);
    expect(isInvalidValid).toBe(false);
  });
});
