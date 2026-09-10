import { C2CStatus } from '../types';

export interface C2CDetectionResult {
  c2cStatus: C2CStatus;
  confidence: number;
  reasoning: string;
}

export const detectC2C = (description: string = '', title: string = '', employmentType: string = ''): C2CDetectionResult => {
  const combined = `${title} ${employmentType} ${description}`.toLowerCase();

  if (!combined.trim()) {
    return {
      c2cStatus: 'UNKNOWN',
      confidence: 0.2,
      reasoning: 'No description or employment type provided for C2C analysis.'
    };
  }

  // Explicit negative patterns (W2 Only, No C2C, etc.)
  const explicitNoPatterns = [
    /\bno\s+c2c\b/i,
    /\bno\s+corp\s*[-to–]*\s*corp\b/i,
    /\bnot\s+eligible\s+for\s+c2c\b/i,
    /\bnot\s+open\s+to\s+c2c\b/i,
    /\bw2\s+only\b/i,
    /\bw-2\s+only\b/i,
    /\bno\s+1099\b/i,
    /\bno\s+third\s+part(?:y|ies)\b/i,
    /\bno\s+c2c\s+or\s+1099\b/i,
    /\b(?:cannot|can't)\s+(?:.*?\s+)?c2c\b/i,
    /\bwe\s+(?:do\s+not|cannot|can't)\s+(?:work\s+with|accept|sponsor|do)\s+(?:or\s+\w+\s+)?c2c\b/i
  ];

  for (const regex of explicitNoPatterns) {
    if (regex.test(combined)) {
      return {
        c2cStatus: 'NO',
        confidence: 0.95,
        reasoning: 'Job explicitly excludes C2C or specifies W-2 only.'
      };
    }
  }

  // Explicit positive C2C patterns
  const explicitYesPatterns = [
    /\bc2c\b/i,
    /\bcorp\s*[-to–]+\s*corp\b/i,
    /\bcorp2corp\b/i,
    /\bcorporation\s+to\s+corporation\b/i,
    /\b1099\b/i,
    /\bindependent\s+contractor\b/i,
    /\bc2c\s+or\s+w2\b/i,
    /\bw2\s+or\s+c2c\b/i,
    /\bc2c\s+candidates?\s+welcome\b/i,
    /\bc2c\s+eligible\b/i,
    /\bopen\s+to\s+c2c\b/i,
    /\bthird\s+party\s+candidates\b/i
  ];

  for (const regex of explicitYesPatterns) {
    if (regex.test(combined)) {
      return {
        c2cStatus: 'YES',
        confidence: 0.9,
        reasoning: 'Job description explicitly mentions C2C, Corp-to-Corp, or 1099 terms.'
      };
    }
  }

  // Ambiguous contractor patterns that require manual verification
  const ambiguousPatterns = [
    /\bcontract(?:or)?\b/i,
    /\bfreelance\b/i,
    /\btemp(?:orary)?\s+position\b/i,
    /\bconsulting\b/i,
    /\bhourly\s+rate\b/i
  ];

  for (const regex of ambiguousPatterns) {
    if (regex.test(combined)) {
      return {
        c2cStatus: 'UNKNOWN',
        confidence: 0.5,
        reasoning: 'Job mentions contract/consulting work but does not specify C2C vs W2. Human verification advised.'
      };
    }
  }

  return {
    c2cStatus: 'UNKNOWN',
    confidence: 0.3,
    reasoning: 'No specific C2C or contract terms identified in job posting.'
  };
};
