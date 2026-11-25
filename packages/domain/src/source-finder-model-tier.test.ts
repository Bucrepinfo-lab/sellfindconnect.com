import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXPLANATION_MODEL,
  PREMIUM_EXPLANATION_MODEL,
  EXPLANATION_MODEL_TIERS,
  isSupportedExplanationModel,
  explanationModelTier,
  selectExplanationModel,
  AI_ROLLOUT_BPS_MAX,
} from './source-finder-model-tier';
import { MATCH_EXPLANATION_MODEL } from './match-explanation';

describe('explanation model allow-list', () => {
  it('keeps the default model aligned with the explainer constant', () => {
    expect(DEFAULT_EXPLANATION_MODEL).toBe(MATCH_EXPLANATION_MODEL);
    expect(isSupportedExplanationModel(DEFAULT_EXPLANATION_MODEL)).toBe(true);
    expect(explanationModelTier(DEFAULT_EXPLANATION_MODEL)).toBe('CHEAP');
  });

  it('registers Claude Fable 5.2 as an approved premium model', () => {
    expect(PREMIUM_EXPLANATION_MODEL).toBe('claude-fable-5-2');
    expect(isSupportedExplanationModel('claude-fable-5-2')).toBe(true);
    expect(explanationModelTier('claude-fable-5-2')).toBe('PREMIUM');
  });

  it('rejects unknown or malformed models (fail closed)', () => {
    expect(isSupportedExplanationModel('gpt-4o')).toBe(false);
    expect(isSupportedExplanationModel('claude-fable-9-9')).toBe(false);
    expect(isSupportedExplanationModel('')).toBe(false);
    expect(isSupportedExplanationModel(undefined)).toBe(false);
    expect(isSupportedExplanationModel(null)).toBe(false);
    expect(explanationModelTier('nope')).toBeUndefined();
  });

  it('never classifies the default/cheap model as premium', () => {
    expect(EXPLANATION_MODEL_TIERS[DEFAULT_EXPLANATION_MODEL]).not.toBe('PREMIUM');
  });
});

describe('selectExplanationModel', () => {
  const base = {
    defaultModel: DEFAULT_EXPLANATION_MODEL,
    premiumModel: PREMIUM_EXPLANATION_MODEL,
  };

  it('stays on the default when not eligible, whatever the rollout', () => {
    const out = selectExplanationModel({
      ...base,
      rolloutBps: AI_ROLLOUT_BPS_MAX,
      eligible: false,
      assignmentKey: 'tenant-1',
    });
    expect(out.model).toBe(DEFAULT_EXPLANATION_MODEL);
    expect(out.premium).toBe(false);
    expect(out.reason).toBe('NOT_ELIGIBLE');
  });

  it('stays on the default when the rollout is zero', () => {
    const out = selectExplanationModel({
      ...base,
      rolloutBps: 0,
      eligible: true,
      assignmentKey: 't',
    });
    expect(out.premium).toBe(false);
    expect(out.reason).toBe('ROLLOUT_ZERO');
  });

  it('routes eligible traffic to premium at a full rollout', () => {
    const out = selectExplanationModel({
      ...base,
      rolloutBps: AI_ROLLOUT_BPS_MAX,
      eligible: true,
      assignmentKey: 'tenant-xyz',
    });
    expect(out.model).toBe(PREMIUM_EXPLANATION_MODEL);
    expect(out.tier).toBe('PREMIUM');
    expect(out.premium).toBe(true);
    expect(out.reason).toBe('PREMIUM_SELECTED');
  });

  it('is stable for the same assignment key', () => {
    const opts = { ...base, rolloutBps: 5_000, eligible: true, assignmentKey: 'stable-key' };
    const a = selectExplanationModel(opts);
    const b = selectExplanationModel(opts);
    expect(a.model).toBe(b.model);
    expect(a.reason).toBe(b.reason);
  });

  it('splits a population roughly in line with the rollout share', () => {
    let premium = 0;
    const n = 4_000;
    for (let i = 0; i < n; i += 1) {
      const out = selectExplanationModel({
        ...base,
        rolloutBps: 2_500, // 25%
        eligible: true,
        assignmentKey: `tenant-${i}`,
      });
      if (out.premium) premium += 1;
    }
    const share = premium / n;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.3);
  });

  it('fails closed to the default when the premium model is unapproved or unset', () => {
    expect(
      selectExplanationModel({
        defaultModel: DEFAULT_EXPLANATION_MODEL,
        eligible: true,
        rolloutBps: 10_000,
        assignmentKey: 'k',
      }).reason,
    ).toBe('PREMIUM_UNAVAILABLE');
    expect(
      selectExplanationModel({
        defaultModel: DEFAULT_EXPLANATION_MODEL,
        premiumModel: 'totally-made-up',
        eligible: true,
        rolloutBps: 10_000,
        assignmentKey: 'k',
      }).premium,
    ).toBe(false);
  });

  it('treats a non-integer or negative rollout as zero (fail closed)', () => {
    expect(
      selectExplanationModel({ ...base, rolloutBps: -5, eligible: true, assignmentKey: 'k' })
        .reason,
    ).toBe('ROLLOUT_ZERO');
    expect(
      selectExplanationModel({ ...base, rolloutBps: 12.5, eligible: true, assignmentKey: 'k' })
        .reason,
    ).toBe('ROLLOUT_ZERO');
  });

  it('flags a default model that is not on the allow-list', () => {
    const out = selectExplanationModel({
      defaultModel: 'mystery-model',
      eligible: false,
      assignmentKey: 'k',
    });
    expect(out.reason).toBe('DEFAULT_INVALID');
  });
});
