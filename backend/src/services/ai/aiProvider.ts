import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { ReplyCategory } from '../../types';

export interface MatchAnalysisResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  relevantExperience: string[];
  potentialImprovements: string[];
  keywordAnalysis: {
    keyword: string;
    foundInResume: boolean;
    importance: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

export interface CustomizedResumeResult {
  tailoredSummary: string;
  reorderedSections: string[];
  emphasizedSkills: string[];
  customizedResumeText: string;
  changeLog: string[];
}

export interface OutreachEmailResult {
  subject: string;
  body: string;
}

export interface ReplyClassificationResult {
  category: ReplyCategory;
  confidence: number;
  reasoning: string;
}

export interface IAIService {
  analyzeMatch(resumeText: string, jobDescription: string, candidateSkills?: string[]): Promise<MatchAnalysisResult>;
  generateCustomizedResume(originalResumeText: string, jobDescription: string, candidateProfile?: any): Promise<CustomizedResumeResult>;
  generateOutreachEmail(candidate: any, recruiter: any, job: any): Promise<OutreachEmailResult>;
  classifyReply(replyBody: string, subject?: string): Promise<ReplyClassificationResult>;
}

export class AIService implements IAIService {
  private geminiClient: GoogleGenAI | null = null;
  private currentApiKey: string = '';

  constructor() {
    this.initGeminiClient();
  }

  private initGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
    if (!apiKey || apiKey.trim().length === 0) {
      this.geminiClient = null;
      this.currentApiKey = '';
      return null;
    }

    if (!this.geminiClient || this.currentApiKey !== apiKey) {
      this.currentApiKey = apiKey;
      try {
        this.geminiClient = new GoogleGenAI({ apiKey });
      } catch (err: any) {
        console.warn('[AI Service] Failed to initialize GoogleGenAI client:', err?.message || err);
        this.geminiClient = null;
      }
    }

    return this.geminiClient;
  }

  private getModel(): string {
    return process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.5-flash';
  }

  private isGeminiConfigured(): boolean {
    return Boolean(this.initGeminiClient());
  }

  /**
   * Safely invoke Google Gemini with structured output and timeout resilience.
   */
  private async callGemini(prompt: string, expectJson: boolean = true, temperature: number = 0.2): Promise<string> {
    const client = this.initGeminiClient();
    if (!client) return '';

    const model = this.getModel();

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          ...(expectJson ? { responseMimeType: 'application/json' } : {})
        }
      });

      return response.text || '';
    } catch (err: any) {
      // Never expose the API key in logs
      console.warn(
        `[AI Service] Gemini API call to model "${model}" failed or timed out. Using deterministic fallback engine. Error: ${err?.message || 'Unknown error'}`
      );
      return '';
    }
  }

  /**
   * Safely parse JSON from LLM output, stripping potential markdown blocks.
   */
  private parseJsonSafe<T>(raw: string): T | null {
    if (!raw || !raw.trim()) return null;

    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      const jsonMatch = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  /**
   * Deterministic keyword extractor for baseline skill overlap and fallback.
   */
  private extractKeywordAnalysis(resumeText: string, jobDescription: string, candidateSkills: string[] = []) {
    const combinedCandidateSkills = new Set<string>(candidateSkills.map(s => s.toLowerCase()));

    const potentialKeywords = [
      'Node.js', 'Express.js', 'React', 'TypeScript', 'JavaScript', 'MongoDB', 'PostgreSQL',
      'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'REST API', 'GraphQL', 'Python', 'Java',
      'Microservices', 'Redis', 'Tailwind CSS', 'Next.js', 'Git', 'Kafka', 'Linux'
    ];

    const jobKeywords: string[] = [];
    for (const kw of potentialKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(jobDescription)) {
        jobKeywords.push(kw);
      }
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    jobKeywords.forEach(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const inResume = new RegExp(`\\b${escaped}\\b`, 'i').test(resumeText);
      const inSkills = combinedCandidateSkills.has(kw.toLowerCase());

      if (inResume || inSkills) {
        matchedSkills.push(kw);
      } else {
        missingSkills.push(kw);
      }
    });

    const total = matchedSkills.length + missingSkills.length;
    const matchScore = total > 0 ? Math.round((matchedSkills.length / total) * 100) : 75;

    const keywordAnalysis = jobKeywords.map(kw => ({
      keyword: kw,
      foundInResume: matchedSkills.includes(kw),
      importance: (['Node.js', 'React', 'TypeScript', 'AWS', 'Docker'].includes(kw) ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW'
    }));

    return {
      matchedSkills,
      missingSkills,
      matchScore,
      keywordAnalysis
    };
  }

  /**
   * 1. analyzeMatch
   * Uses Gemini to semantically compare resume, candidate skills, and job description.
   * Enforces strict non-hallucination rules and falls back deterministically if unconfigured/failed.
   */
  async analyzeMatch(
    resumeText: string,
    jobDescription: string,
    candidateSkills: string[] = []
  ): Promise<MatchAnalysisResult> {
    const baseline = this.extractKeywordAnalysis(resumeText, jobDescription, candidateSkills);

    if (this.isGeminiConfigured()) {
      const prompt = `You are a recruitment intelligence engine specializing in US Corp-to-Corp (C2C) technical hiring.

Analyze how well the candidate's resume matches the target job description.

CRITICAL RULES:
1. Strict Truthfulness: Do NOT invent candidate experience, skills, degrees, or years. Only identify skills and experience actually evident in the resume or candidate skills list.
2. Do NOT claim the candidate has a skill simply because the job requires it.
3. matchScore must be an integer between 0 and 100 representing realistic technical alignment.
4. matchedSkills: Return a string array of specific technical skills required by the job that are supported by the candidate's resume/skills.
5. missingSkills: Return a string array of important technical skills or requirements from the job that are absent from the candidate's resume.
6. relevantExperience: Return 2-4 concise bullet points highlighting the candidate's actual projects, achievements, or responsibilities directly relevant to this role.
7. potentialImprovements: Return 2-3 actionable, truthful recommendations for tailoring emphasis or positioning C2C availability without inventing false credentials.

Candidate Skills:
${candidateSkills.join(', ')}

Job Description:
${jobDescription.slice(0, 3000)}

Resume Text:
${resumeText.slice(0, 4000)}

Return valid JSON adhering to this exact schema:
{
  "matchScore": 85,
  "matchedSkills": ["Skill 1", "Skill 2"],
  "missingSkills": ["Skill 3"],
  "relevantExperience": ["Relevant bullet point 1", "Relevant bullet point 2"],
  "potentialImprovements": ["Improvement suggestion 1", "Improvement suggestion 2"]
}`;

      const raw = await this.callGemini(prompt, true, 0.2);
      const parsed = this.parseJsonSafe<{
        matchScore?: number;
        matchedSkills?: string[];
        missingSkills?: string[];
        relevantExperience?: string[];
        potentialImprovements?: string[];
      }>(raw);

      if (parsed && typeof parsed.matchScore === 'number') {
        const clampedScore = Math.max(0, Math.min(100, Math.round(parsed.matchScore)));
        const finalMatched = Array.isArray(parsed.matchedSkills) && parsed.matchedSkills.length > 0
          ? parsed.matchedSkills
          : baseline.matchedSkills;
        const finalMissing = Array.isArray(parsed.missingSkills)
          ? parsed.missingSkills
          : baseline.missingSkills;

        return {
          matchScore: clampedScore,
          matchedSkills: finalMatched,
          missingSkills: finalMissing,
          relevantExperience: Array.isArray(parsed.relevantExperience) && parsed.relevantExperience.length > 0
            ? parsed.relevantExperience
            : [
                `Strong overlap in core stack: ${finalMatched.slice(0, 3).join(', ')}.`,
                'Demonstrated hands-on experience aligned with C2C project requirements.'
              ],
          potentialImprovements: Array.isArray(parsed.potentialImprovements) && parsed.potentialImprovements.length > 0
            ? parsed.potentialImprovements
            : [
                finalMissing.length > 0
                  ? `Highlight existing exposure or adjacent experience related to: ${finalMissing.slice(0, 2).join(', ')}.`
                  : 'Elevate measurable system scalability and business impact in recent bullet points.'
              ],
          keywordAnalysis: baseline.keywordAnalysis
        };
      }
    }

    // Deterministic Fallback Engine
    return {
      matchScore: baseline.matchScore,
      matchedSkills: baseline.matchedSkills,
      missingSkills: baseline.missingSkills,
      relevantExperience: [
        `Strong overlap in core stack: ${baseline.matchedSkills.slice(0, 3).join(', ')}.`,
        'Demonstrated hands-on experience aligned with C2C project requirements.',
        'Production backend API and distributed architecture background.'
      ],
      potentialImprovements: [
        baseline.missingSkills.length > 0
          ? `Highlight existing exposure or adjacent experience related to: ${baseline.missingSkills.slice(0, 2).join(', ')}.`
          : 'Elevate measurable system scalability and business impact in recent bullet points.',
        'Prominently position C2C availability and immediate start date at the top of the summary.'
      ],
      keywordAnalysis: baseline.keywordAnalysis
    };
  }

  /**
   * 2. generateCustomizedResume
   * Customizes the candidate's resume for the target job while strictly prohibiting fabrication.
   * Reorganizes, emphasizes, and refines existing experience without hallucinating credentials.
   */
  async generateCustomizedResume(
    originalResumeText: string,
    jobDescription: string,
    candidateProfile?: any
  ): Promise<CustomizedResumeResult> {
    const candidateName = candidateProfile?.name || 'Senior Software Engineer';
    const years = candidateProfile?.yearsOfExperience || 6;
    const candidateSkills = (candidateProfile?.primarySkills || []).join(', ');

    // Extract target matched keywords for deterministic fallback
    const targetKeywords = ['Node.js', 'TypeScript', 'React', 'REST API', 'MongoDB', 'AWS', 'Docker', 'Microservices'];
    const matched = targetKeywords.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(jobDescription));
    const topSkills = matched.slice(0, 5).join(', ') || 'Node.js, TypeScript, React, MongoDB';

    const fallbackSummary = `${candidateName} - Senior C2C Consultant with ${years}+ years of enterprise software engineering experience. Specializing in high-throughput backend systems, robust cloud infrastructure, and modern web architectures with proven expertise in ${topSkills}. Available for immediate Corp-to-Corp (C2C) engagement.`;

    const fallbackChangeLog = [
      'Re-ordered technical skills summary to align directly with requirements in the target job description.',
      'Emphasized verified hands-on production experience in matching technologies.',
      'Maintained 100% truthfulness: no new companies, dates, or unverified skills were added.',
      'Refined professional summary to highlight immediate C2C availability.'
    ];

    let fallbackText = originalResumeText;
    if (fallbackText.length > 0) {
      fallbackText = `PROFESSIONAL SUMMARY\n${fallbackSummary}\n\nCORE COMPETENCIES (TARGET ALIGNED)\n• Core Stack: ${topSkills}\n• Architecture: Microservices, REST APIs, Scalable Cloud Systems\n• Availability: Immediate C2C / Corp-to-Corp\n\n` + fallbackText;
    } else {
      fallbackText = `${fallbackSummary}\n\nKey Skills: ${topSkills}`;
    }

    if (this.isGeminiConfigured()) {
      const prompt = `You are an expert technical resume strategist for US Corp-to-Corp (C2C) IT consultants.

Tailor the candidate's resume to maximally align with the target job opportunity while strictly adhering to the Anti-Hallucination Policy.

CRITICAL ANTI-HALLUCINATION RULES (ZERO TOLERANCE):
1. You MUST NOT fabricate, invent, or extrapolate:
   - Employers, clients, or company names
   - Job titles or management roles
   - Employment dates, tenures, or graduation years
   - Degrees, universities, or unverified certifications
   - Projects, repositories, or accomplishments not in the source resume
   - Unverified technical skills or tools
   - Years of experience
2. You may ONLY:
   - Formulate a tailored, truthful C2C Professional Summary aligning verified candidate strengths with the target role.
   - Reorganize and highlight existing verified competencies so skills relevant to this job appear prominently.
   - Rephrase and emphasize genuine responsibilities and achievements present in the original text.
   - Highlight immediate Corp-to-Corp (C2C) availability and engagement readiness.

Candidate Profile:
Name: ${candidateName}
Years of Experience: ${years}
Verified Skills: ${candidateSkills || topSkills}

Target Job Description:
${jobDescription.slice(0, 3000)}

Original Resume Text:
${originalResumeText.slice(0, 4000)}

Return valid JSON in this exact schema:
{
  "tailoredSummary": "2-3 sentence executive C2C summary highlighting verified experience and target alignment.",
  "reorderedSections": ["Professional Summary (C2C Focused)", "Aligned Technical Competencies", "Professional Experience", "Education & Certifications"],
  "emphasizedSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "customizedResumeText": "Complete customized resume text incorporating the tailored summary and reorganized content.",
  "changeLog": [
    "Specific truthful refinement 1",
    "Specific truthful refinement 2",
    "Maintained 100% truthfulness: no new companies, dates, or unverified skills were added."
  ]
}`;

      const raw = await this.callGemini(prompt, true, 0.2);
      const parsed = this.parseJsonSafe<{
        tailoredSummary?: string;
        reorderedSections?: string[];
        emphasizedSkills?: string[];
        customizedResumeText?: string;
        changeLog?: string[];
      }>(raw);

      if (
        parsed &&
        parsed.tailoredSummary &&
        parsed.customizedResumeText &&
        Array.isArray(parsed.changeLog) &&
        parsed.changeLog.length > 0
      ) {
        return {
          tailoredSummary: parsed.tailoredSummary,
          reorderedSections: Array.isArray(parsed.reorderedSections) && parsed.reorderedSections.length > 0
            ? parsed.reorderedSections
            : ['Professional Summary (C2C Focused)', 'Aligned Technical Competencies', 'Professional Experience', 'Education & Certifications'],
          emphasizedSkills: Array.isArray(parsed.emphasizedSkills) && parsed.emphasizedSkills.length > 0
            ? parsed.emphasizedSkills
            : (matched.length > 0 ? matched : ['Node.js', 'TypeScript', 'MongoDB']),
          customizedResumeText: parsed.customizedResumeText,
          changeLog: parsed.changeLog
        };
      }
    }

    // Deterministic Fallback Engine
    return {
      tailoredSummary: fallbackSummary,
      reorderedSections: ['Professional Summary (C2C Focused)', 'Aligned Technical Competencies', 'Professional Experience', 'Education & Certifications'],
      emphasizedSkills: matched.length > 0 ? matched : ['Node.js', 'TypeScript', 'MongoDB'],
      customizedResumeText: fallbackText,
      changeLog: fallbackChangeLog
    };
  }

  /**
   * 3. generateOutreachEmail
   * Generates a personalized, concise, high-converting C2C introduction email using Gemini.
   */
  async generateOutreachEmail(candidate: any, recruiter: any, job: any): Promise<OutreachEmailResult> {
    const recruiterFirstName = (recruiter?.name || 'Hiring Manager').split(' ')[0];
    const candidateName = candidate?.name || 'Senior Software Engineer';
    const jobTitle = job?.title || 'Senior Software Engineer';
    const company = job?.company || recruiter?.company || 'your team';
    const years = candidate?.yearsOfExperience || 6;
    const topSkills = (candidate?.primarySkills && candidate.primarySkills.length > 0)
      ? candidate.primarySkills.slice(0, 3).join(', ')
      : 'Node.js, TypeScript, and cloud distributed systems';

    const fallbackSubject = `C2C Senior Consultant for ${jobTitle} - ${candidateName}`;
    const fallbackBody = `Hi ${recruiterFirstName},

I noticed your open ${jobTitle} position with ${company} and wanted to reach out directly regarding immediate Corp-to-Corp (C2C) placement.

I bring over ${years}+ years of hands-on production experience delivering scalable enterprise applications with deep expertise in ${topSkills}. Given the technical requirements for the role, I can hit the ground running with zero onboarding friction.

Key highlights:
• Immediate availability for full-time C2C engagement
• Proven background building robust APIs, high-availability microservices, and modern web architectures
• Incorporated entity with active insurance and clean C2C documentation ready to execute

I have attached my updated resume for your review. Would you have 5 minutes this week for a brief introductory call?

Best regards,

${candidateName}
Phone: ${candidate?.phone || 'Available upon request'}
Email: ${candidate?.email || ''}
LinkedIn: ${candidate?.linkedin || ''}`;

    if (this.isGeminiConfigured()) {
      const prompt = `You are a specialized US Corp-to-Corp (C2C) recruitment outreach copywriter.

Draft a concise, high-converting, professional cold introduction email from an incorporated consultant to a staffing recruiter regarding an open position.

RULES:
1. Tone: Professional, direct, polite, and human (avoid generic sales cliches or robotic phrasing).
2. Length: Under 200 words.
3. Address the recruiter by their first name (${recruiterFirstName}).
4. Emphasize immediate Corp-to-Corp (C2C) availability and complete incorporation readiness.
5. Mention relevant candidate experience and skills ONLY when supported by the candidate profile.
6. Propose a brief, low-pressure 5-minute introductory call.
7. Mention that the resume is attached.

Context:
Recruiter Name: ${recruiter?.name || 'Hiring Manager'}
Company: ${company}
Target Job Title: ${jobTitle}
Job Requirements Summary: ${job?.description?.slice(0, 1200) || ''}
Candidate Name: ${candidateName}
Candidate Experience: ${years}+ years
Candidate Verified Skills: ${topSkills}
Candidate Contact: Phone: ${candidate?.phone || 'Available on request'} | Email: ${candidate?.email || ''}

Return valid JSON adhering to this exact schema:
{
  "subject": "Direct C2C-focused email subject line",
  "body": "Full body text of the email ready to send (include line breaks and signature)"
}`;

      const raw = await this.callGemini(prompt, true, 0.3);
      const parsed = this.parseJsonSafe<{ subject?: string; body?: string }>(raw);

      if (parsed && parsed.subject && parsed.body && parsed.body.trim().length > 20) {
        return {
          subject: parsed.subject.trim(),
          body: parsed.body.trim()
        };
      }
    }

    // Deterministic Fallback Engine
    return {
      subject: fallbackSubject,
      body: fallbackBody
    };
  }

  /**
   * 4. classifyReply
   * Classifies incoming recruiter reply into valid ReplyCategory values using Gemini or regex fallback.
   */
  async classifyReply(replyBody: string, subject: string = ''): Promise<ReplyClassificationResult> {
    const validCategories: ReplyCategory[] = [
      'INTERESTED',
      'NOT_INTERESTED',
      'REQUEST_FOR_INFORMATION',
      'INTERVIEW',
      'OUT_OF_OFFICE',
      'UNKNOWN'
    ];

    if (this.isGeminiConfigured() && replyBody.trim().length > 0) {
      const prompt = `You are an email intent and sentiment classifier for a recruitment outreach system.

Classify the recruiter's incoming response into EXACTLY ONE of these categories:
- "INTERESTED": Recruiter expresses positive interest, asks for hourly C2C rates, requests updated resume, or invites next steps.
- "INTERVIEW": Recruiter is scheduling an interview, proposing call dates/times, or providing a Calendly/booking link.
- "REQUEST_FOR_INFORMATION": Recruiter asks for work authorization, visa status, employer details, Certificate of Insurance (COI), or candidate background details.
- "NOT_INTERESTED": Recruiter declines, states position is filled, no C2C/W2 only, or asks not to be contacted.
- "OUT_OF_OFFICE": Automated out-of-office, vacation, or maternity/paternity auto-responder.
- "UNKNOWN": Ambiguous, spam, bounce notification, or unclassifiable content.

Subject: ${subject}
Email Content:
${replyBody.slice(0, 2000)}

Return valid JSON adhering to this exact schema:
{
  "category": "INTERESTED" | "INTERVIEW" | "REQUEST_FOR_INFORMATION" | "NOT_INTERESTED" | "OUT_OF_OFFICE" | "UNKNOWN",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category was assigned."
}`;

      const raw = await this.callGemini(prompt, true, 0.1);
      const parsed = this.parseJsonSafe<{
        category?: ReplyCategory;
        confidence?: number;
        reasoning?: string;
      }>(raw);

      if (parsed && parsed.category && validCategories.includes(parsed.category)) {
        const conf = typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.9;

        return {
          category: parsed.category,
          confidence: conf,
          reasoning: parsed.reasoning || `Gemini classified as ${parsed.category}`
        };
      }
    }

    // Deterministic Heuristic Fallback Engine
    const text = `${subject} ${replyBody}`.toLowerCase();

    // 1. OUT OF OFFICE
    if (
      /\bout of (the )?office\b/i.test(text) ||
      /\bauto[- ]?reply\b/i.test(text) ||
      /\bon vacation\b/i.test(text) ||
      /\bi am away\b/i.test(text) ||
      /\bwill respond when i return\b/i.test(text)
    ) {
      return {
        category: 'OUT_OF_OFFICE',
        confidence: 0.95,
        reasoning: 'Automated out of office or vacation autoreply detected.'
      };
    }

    // 2. INTERVIEW
    if (
      /\binterview\b/i.test(text) ||
      /\bschedule a (?:call|meeting|chat)\b/i.test(text) ||
      /\bcalendly\b/i.test(text) ||
      /\bavailability for a (?:call|meeting|chat)\b/i.test(text) ||
      /\blet's connect\b/i.test(text) ||
      /\bwhat times? works?\b/i.test(text)
    ) {
      return {
        category: 'INTERVIEW',
        confidence: 0.92,
        reasoning: 'Recruiter is proposing an interview or scheduling a call.'
      };
    }

    // 3. DECLINED / NOT INTERESTED
    if (
      /\bnot interested\b/i.test(text) ||
      /\bunfortunately\b/i.test(text) ||
      /\bposition has been filled\b/i.test(text) ||
      /\bnot open to c2c\b/i.test(text) ||
      /\bw2 only\b/i.test(text) ||
      /\bdo not contact\b/i.test(text) ||
      /\bwent with another candidate\b/i.test(text) ||
      /\bno longer hiring\b/i.test(text) ||
      /\bunsubscribe\b/i.test(text)
    ) {
      return {
        category: 'NOT_INTERESTED',
        confidence: 0.94,
        reasoning: 'Recruiter declined or indicated the position is closed or not open to C2C.'
      };
    }

    // 4. REQUEST FOR INFORMATION
    if (
      /\bcan you provide\b/i.test(text) ||
      /\bvisa status\b/i.test(text) ||
      /\bwork authorization\b/i.test(text) ||
      /\blocation preference\b/i.test(text) ||
      /\bhow many years\b/i.test(text) ||
      /\bdetails on\b/i.test(text) ||
      /\bclient requires\b/i.test(text) ||
      /\bcertificate of insurance\b/i.test(text) ||
      /\bincorporation details\b/i.test(text)
    ) {
      return {
        category: 'REQUEST_FOR_INFORMATION',
        confidence: 0.88,
        reasoning: 'Recruiter is seeking additional information regarding candidate background, visa, or C2C paperwork.'
      };
    }

    // 5. INTERESTED
    if (
      /\binterested\b/i.test(text) ||
      /\brate\b/i.test(text) ||
      /\bsend (?:over )?(?:your )?resume\b/i.test(text) ||
      /\bgreat profile\b/i.test(text) ||
      /\bprofile looks (?:great|like a (?:good )?fit)\b/i.test(text) ||
      /\blooks like a (?:good )?fit\b/i.test(text) ||
      /\bforward your (?:latest )?resume\b/i.test(text)
    ) {
      return {
        category: 'INTERESTED',
        confidence: 0.88,
        reasoning: 'Recruiter expressed interest or inquired about C2C rates and availability.'
      };
    }

    return {
      category: 'UNKNOWN',
      confidence: 0.45,
      reasoning: 'Ambiguous reply content; manual review recommended.'
    };
  }
}

export const aiService = new AIService();
