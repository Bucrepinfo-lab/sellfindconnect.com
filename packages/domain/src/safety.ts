export type BlockedCategory =
  | 'WEAPONS_EXPLOSIVES'
  | 'SEXUAL_EXPLOITATION'
  | 'CHILD_ENDANGERMENT'
  | 'HUMAN_TRAFFICKING'
  | 'ILLEGAL_DRUGS'
  | 'VIOLENT_EXTREMISM'
  | 'HATE_THREATS'
  | 'SELF_HARM_GRAPHIC_VIOLENCE'
  | 'CRIMINAL_SERVICES'
  | 'ILLEGAL_WILDLIFE_TRADE';

export type SafetyDecision =
  | { allowed: true; action: 'ALLOW' }
  | {
      allowed: false;
      action: 'BLOCK';
      category: BlockedCategory;
      matchedTerm: string;
      policyCode: string;
    };

export type ProhibitedCategorySummary = {
  category: BlockedCategory;
  label: string;
  summary: string;
};

type PolicyGroup = {
  category: BlockedCategory;
  policyCode: string;
  terms: string[];
};

export const prohibitedCategorySummaries: ProhibitedCategorySummary[] = [
  {
    category: 'WEAPONS_EXPLOSIVES',
    label: 'Weapons and explosives',
    summary: 'Weapons, ammunition, explosives, parts, accessories, files, instructions or sourcing.',
  },
  {
    category: 'SEXUAL_EXPLOITATION',
    label: 'Pornography and sexual services',
    summary: 'Pornography, explicit sexual content, sexual services, solicitation or exploitation.',
  },
  {
    category: 'CHILD_ENDANGERMENT',
    label: 'Child abuse and endangerment',
    summary: 'Any sexualization, grooming, exploitation, trafficking or endangerment of a child.',
  },
  {
    category: 'HUMAN_TRAFFICKING',
    label: 'Human trafficking and human trade',
    summary: 'Trafficking, slavery, forced labor, forced marriage, organ trade or treating people as goods.',
  },
  {
    category: 'ILLEGAL_DRUGS',
    label: 'Illegal drugs',
    summary: 'Illegal or controlled drug sales, sourcing, production, cultivation or related paraphernalia.',
  },
  {
    category: 'VIOLENT_EXTREMISM',
    label: 'Terrorism and violent extremism',
    summary: 'Recruitment, propaganda, fundraising, glorification or instructions for extremist violence.',
  },
  {
    category: 'HATE_THREATS',
    label: 'Hate, threats and coercion',
    summary: 'Hate-based violence, threats, blackmail, extortion, assassination or violence-for-hire.',
  },
  {
    category: 'SELF_HARM_GRAPHIC_VIOLENCE',
    label: 'Self-harm and graphic violence',
    summary: 'Self-harm encouragement, suicide facilitation, torture, gore or graphic violent material.',
  },
  {
    category: 'CRIMINAL_SERVICES',
    label: 'Criminal goods and services',
    summary: 'Stolen or counterfeit goods, fraud, malware, hacking, fake documents or financial crime.',
  },
  {
    category: 'ILLEGAL_WILDLIFE_TRADE',
    label: 'Illegal wildlife trade',
    summary: 'Poaching or trade in protected species, ivory, endangered wildlife or related products.',
  },
];

const policyGroups: PolicyGroup[] = [
  {
    category: 'WEAPONS_EXPLOSIVES',
    policyCode: 'ZT-WEAPONS-001',
    terms: [
      'weapon',
      'weapons',
      'firearm',
      'firearms',
      'gun',
      'guns',
      'pistol',
      'rifle',
      'shotgun',
      'ammunition',
      'ammo for sale',
      'explosive',
      'explosive device',
      'bomb',
      'bomb making',
      'grenade',
      'weapon parts',
      'firearm parts',
      'weapon accessories',
      'weapon conversion',
      'firearm conversion',
      'ghost gun',
      '3d printed gun',
      '3d printable weapon',
      'gun for sale',
      'rifle for sale',
    ],
  },
  {
    category: 'SEXUAL_EXPLOITATION',
    policyCode: 'ZT-SEXUAL-001',
    terms: [
      'porn',
      'pornography',
      'explicit sexual content',
      'sexual services',
      'sexual service',
      'sexual solicitation',
      'escort services',
      'escort service',
      'prostitution',
      'compensated dating',
      'sugar dating',
      'adult entertainment',
      'fetish content',
      'bestiality',
      'sexual deepfake',
      'sextortion',
    ],
  },
  {
    category: 'CHILD_ENDANGERMENT',
    policyCode: 'ZT-CHILD-001',
    terms: [
      'child porn',
      'child sexual abuse',
      'child sexual abuse material',
      'csam',
      'child exploitation',
      'sexual content involving minors',
      'underage sexual content',
      'grooming a minor',
      'grooming minors',
      'sexualization of minors',
      'child trafficking',
      'child sextortion',
    ],
  },
  {
    category: 'HUMAN_TRAFFICKING',
    policyCode: 'ZT-TRAFFICKING-001',
    terms: [
      'human trafficking',
      'human trade',
      'forced labor',
      'forced labour',
      'slavery',
      'servitude',
      'debt bondage',
      'forced marriage',
      'illegal adoption',
      'organ trafficking',
      'organ trade',
      'human body parts for sale',
      'person for sale',
    ],
  },
  {
    category: 'ILLEGAL_DRUGS',
    policyCode: 'ZT-DRUGS-001',
    terms: [
      'illegal drugs',
      'controlled drugs for sale',
      'controlled substances for sale',
      'drug manufacturing',
      'drug growing instructions',
      'drug cultivation instructions',
      'drug paraphernalia for illegal use',
      'cocaine for sale',
      'heroin for sale',
      'methamphetamine for sale',
      'fentanyl for sale',
      'marijuana for sale',
      'cannabis for sale',
      'thc for sale',
    ],
  },
  {
    category: 'VIOLENT_EXTREMISM',
    policyCode: 'ZT-EXTREMISM-001',
    terms: [
      'terrorism',
      'terrorist propaganda',
      'terrorist recruitment',
      'violent extremist recruitment',
      'terrorist fundraising',
      'violent extremist fundraising',
      'glorify terrorism',
      'extremist attack instructions',
      'attack civilians',
    ],
  },
  {
    category: 'HATE_THREATS',
    policyCode: 'ZT-HATE-001',
    terms: [
      'hate based violence',
      'incite violence',
      'death threat',
      'blackmail service',
      'extortion service',
      'hitman for hire',
      'assassination service',
      'violence for hire',
    ],
  },
  {
    category: 'SELF_HARM_GRAPHIC_VIOLENCE',
    policyCode: 'ZT-HARM-001',
    terms: [
      'encourage suicide',
      'suicide kit',
      'self harm challenge',
      'torture video',
      'gore video',
      'graphic violence for sale',
    ],
  },
  {
    category: 'CRIMINAL_SERVICES',
    policyCode: 'ZT-CRIME-001',
    terms: [
      'counterfeit goods',
      'fake id for sale',
      'fake documents',
      'forged documents',
      'stolen goods',
      'credential theft',
      'malware for sale',
      'ransomware service',
      'phishing service',
      'hacking for hire',
      'scam service',
      'money laundering service',
      'bribery service',
      'sanctions evasion',
    ],
  },
  {
    category: 'ILLEGAL_WILDLIFE_TRADE',
    policyCode: 'ZT-WILDLIFE-001',
    terms: [
      'endangered species for sale',
      'protected species for sale',
      'poaching service',
      'illegal ivory',
      'ivory for sale',
      'rhino horn for sale',
      'illegal wildlife trade',
    ],
  },
];

function normalize(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return normalized.replace(/\b(?:[a-z0-9]\s+){2,}[a-z0-9]\b/g, (match) =>
    match.replace(/\s+/g, ''),
  );
}

export function evaluateSafetyText(value: string): SafetyDecision {
  const normalizedValue = ` ${normalize(value)} `;

  for (const group of policyGroups) {
    for (const term of group.terms) {
      const normalizedTerm = normalize(term);
      if (normalizedValue.includes(` ${normalizedTerm} `)) {
        return {
          allowed: false,
          action: 'BLOCK',
          category: group.category,
          matchedTerm: term,
          policyCode: group.policyCode,
        };
      }
    }
  }

  return { allowed: true, action: 'ALLOW' };
}

export function evaluateSafetyFields(fields: object): SafetyDecision {
  const values: string[] = [];

  function collect(value: unknown): void {
    if (typeof value === 'string') {
      values.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(collect);
    }
  }

  collect(fields);
  return evaluateSafetyText(values.join(' '));
}
