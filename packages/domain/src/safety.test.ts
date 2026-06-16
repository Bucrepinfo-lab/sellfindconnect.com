import { describe, expect, it } from 'vitest';

import { evaluateSafetyFields, evaluateSafetyText, prohibitedCategorySummaries } from './safety';

describe('evaluateSafetyText', () => {
  it('allows ordinary marketplace content', () => {
    expect(evaluateSafetyText('Fresh tomatoes supplied to hotels in Nairobi')).toEqual({
      allowed: true,
      action: 'ALLOW',
    });
  });

  it('blocks a zero-tolerance weapons offer', () => {
    const decision = evaluateSafetyText('Ammunition available for immediate delivery');

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.category).toBe('WEAPONS_EXPLOSIVES');
      expect(decision.policyCode).toBe('ZT-WEAPONS-001');
    }
  });

  it('normalizes punctuation and casing', () => {
    const decision = evaluateSafetyText('HUMAN-TRAFFICKING offer');

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.category).toBe('HUMAN_TRAFFICKING');
    }
  });

  it.each([
    ['WEAPONS_EXPLOSIVES', 'G.U.N.S available'],
    ['SEXUAL_EXPLOITATION', 'p0rn content subscription'],
    ['CHILD_ENDANGERMENT', 'CSAM trading group'],
    ['HUMAN_TRAFFICKING', 'forced labour recruitment'],
    ['ILLEGAL_DRUGS', 'cocaine for sale'],
    ['VIOLENT_EXTREMISM', 'terrorist fundraising'],
    ['HATE_THREATS', 'hitman for hire'],
    ['SELF_HARM_GRAPHIC_VIOLENCE', 'suicide kit'],
    ['CRIMINAL_SERVICES', 'counterfeit goods supplier'],
    ['ILLEGAL_WILDLIFE_TRADE', 'rhino horn for sale'],
    ['PLATFORM_ABUSE', 'phishing kit setup'],
    ['SPAM_SCAMS', 'fake reviews and click farm package'],
    ['INTELLECTUAL_PROPERTY_ABUSE', 'cracked software license key generator'],
    ['PROHIBITED_INFRASTRUCTURE_USE', 'crypto mining hosting'],
  ] as const)('blocks %s content', (category, text) => {
    const decision = evaluateSafetyText(text);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.category).toBe(category);
    }
  });

  it('checks strings inside nested objects and arrays', () => {
    const decision = evaluateSafetyFields({
      description: 'General trading company',
      media: [{ caption: 'stolen goods available' }],
      tags: ['wholesale'],
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.category).toBe('CRIMINAL_SERVICES');
    }
  });

  it('keeps compliant regulated services available', () => {
    expect(
      evaluateSafetyText('Licensed pharmacy supplying approved prescription medicine to hospitals'),
    ).toEqual({
      allowed: true,
      action: 'ALLOW',
    });
  });

  it('publishes a summary for every blocked category', () => {
    expect(prohibitedCategorySummaries).toHaveLength(14);
    expect(new Set(prohibitedCategorySummaries.map((item) => item.category)).size).toBe(14);
  });
});
