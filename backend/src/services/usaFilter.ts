// USA Location detection service

const US_STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia'
};

const NON_US_PATTERNS = [
  /\bindia\b/i,
  /\bbangalore\b/i,
  /\bhyderabad\b/i,
  /\bpune\b/i,
  /\bmumbai\b/i,
  /\bdelhi\b/i,
  /\bcanada\b/i,
  /\btoronto\b/i,
  /\bvancouver\b/i,
  /\buk\b/i,
  /\blondon\b/i,
  /\bunited kingdom\b/i,
  /\baustralia\b/i,
  /\bgermany\b/i,
  /\bfrance\b/i,
  /\beurope\b/i,
  /\bsingapore\b/i,
  /\bbrazil\b/i,
  /\bmexico\b/i,
  /\bphilippines\b/i
];

export const isUSALocation = (location: string | undefined | null): boolean => {
  if (!location) return false;
  const loc = location.trim();
  if (!loc) return false;

  // Check if explicitly non-US first
  for (const pattern of NON_US_PATTERNS) {
    if (pattern.test(loc) && !/\b(remote\s*-\s*us|us\s*based|usa|united states)\b/i.test(loc)) {
      return false;
    }
  }

  // Common USA keywords
  const usaKeywords = [
    /\bunited states\b/i,
    /\bunited states of america\b/i,
    /\busa\b/i,
    /\bu\.s\.a\./i,
    /\bu\.s\./i,
    /\bus-based\b/i,
    /\bus based\b/i,
    /\bremote\s*[-–]\s*us\b/i,
    /\bremote\s*\(\s*us\s*\)/i,
    /\bremote\s*,\s*us\b/i,
    /\bremote\s*,\s*usa\b/i,
    /\bus\s+remote\b/i,
    /\banywhere in (the )?us\b/i,
    /\bnationwide\s*,\s*us\b/i
  ];

  for (const regex of usaKeywords) {
    if (regex.test(loc)) return true;
  }

  // Exact "US" matching
  if (/^us$/i.test(loc) || /^usa$/i.test(loc)) {
    return true;
  }

  // Check 50 states by full name
  for (const state of Object.values(US_STATES)) {
    const stateRegex = new RegExp(`\\b${state}\\b`, 'i');
    if (stateRegex.test(loc)) {
      return true;
    }
  }

  // Check state postal codes (e.g. "Dallas, TX", "Austin, TX 78701", "CA", "New York, NY")
  for (const code of Object.keys(US_STATES)) {
    const codeRegex = new RegExp(`(?:,\\s*|\\b)${code}(?:\\s+\\d{5}|\\b)`, 'i');
    if (codeRegex.test(loc)) {
      return true;
    }
  }

  return false;
};
