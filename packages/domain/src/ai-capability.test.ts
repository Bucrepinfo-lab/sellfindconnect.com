import { describe, expect, it } from 'vitest';

import {
  evaluateAiSpend,
  priceAiUnits,
  DevInMemoryAiUsageMeter,
  AiUsageMeterRegistry,
  type AiSpendCap,
  type AiUsageSnapshot,
  type AiSpendRequest,
} from './ai-capability';

const cap: AiSpendCap = {
  tenantId: 't1',
  currency: 'KES',
  period: 'MONTH',
  periodLimitMinor: 100_000, // 1,000.00 KES
};

const snapshot: AiUsageSnapshot = {
  tenantId: 't1',
  currency: 'KES',
  period: 'MONTH',
  periodUsedMinor: 40_000,
  asOf: '2026-11-11T00:00:00.000Z',
};

const request: AiSpendRequest = {
  tenantId: 't1',
  capability: 'MATCH_EXPLANATION',
  currency: 'KES',
  estimatedCostMinor: 5_000,
};

describe('evaluateAiSpend', () => {
  it('allows a request that stays within the cap and returns remaining headroom', () => {
    const d = evaluateAiSpend(cap, snapshot, request);
    expect(d.allowed).toBe(true);
    expect(d.reasonCode).toBe('ALLOWED');
    expect(d.remainingMinor).toBe(55_000); // 100k - (40k + 5k)
  });

  it('allows a request that exactly reaches the cap', () => {
    const d = evaluateAiSpend(cap, snapshot, { ...request, estimatedCostMinor: 60_000 });
    expect(d.allowed).toBe(true);
    expect(d.remainingMinor).toBe(0);
  });

  it('denies when the request would exceed the cap', () => {
    const d = evaluateAiSpend(cap, snapshot, { ...request, estimatedCostMinor: 60_001 });
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('CAP_EXCEEDED');
    expect(d.remainingMinor).toBe(0);
  });

  it('fails closed when there is no cap', () => {
    expect(evaluateAiSpend(null, snapshot, request)).toMatchObject({
      allowed: false,
      reasonCode: 'NO_CAP',
    });
  });

  it('fails closed when the snapshot is missing (unknown usage)', () => {
    expect(evaluateAiSpend(cap, null, request)).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ESTIMATE',
    });
  });

  it('rejects an invalid cap (non-integer or non-positive limit)', () => {
    expect(evaluateAiSpend({ ...cap, periodLimitMinor: 0 }, snapshot, request).reasonCode).toBe(
      'INVALID_CAP',
    );
    expect(evaluateAiSpend({ ...cap, periodLimitMinor: 1.5 }, snapshot, request).reasonCode).toBe(
      'INVALID_CAP',
    );
  });

  it('rejects a non-integer or negative estimate', () => {
    expect(evaluateAiSpend(cap, snapshot, { ...request, estimatedCostMinor: 1.2 }).reasonCode).toBe(
      'INVALID_ESTIMATE',
    );
    expect(evaluateAiSpend(cap, snapshot, { ...request, estimatedCostMinor: -1 }).reasonCode).toBe(
      'INVALID_ESTIMATE',
    );
  });

  it('enforces tenant, currency and period isolation', () => {
    expect(evaluateAiSpend(cap, snapshot, { ...request, tenantId: 't2' }).reasonCode).toBe(
      'TENANT_MISMATCH',
    );
    expect(evaluateAiSpend(cap, snapshot, { ...request, currency: 'USD' }).reasonCode).toBe(
      'CURRENCY_MISMATCH',
    );
    expect(evaluateAiSpend(cap, { ...snapshot, period: 'DAY' }, request).reasonCode).toBe(
      'PERIOD_MISMATCH',
    );
  });

  it('honours a per-tenant capability allow-list', () => {
    const restricted: AiSpendCap = { ...cap, enabledCapabilities: ['LISTING_DRAFT'] };
    expect(evaluateAiSpend(restricted, snapshot, request).reasonCode).toBe('CAPABILITY_DISABLED');
    expect(
      evaluateAiSpend(restricted, snapshot, { ...request, capability: 'LISTING_DRAFT' }).allowed,
    ).toBe(true);
  });
});

describe('priceAiUnits', () => {
  it('applies a margin markup in basis points and rounds up', () => {
    expect(priceAiUnits(10_000, 2_000)).toBe(12_000); // +20%
    expect(priceAiUnits(3, 2_000)).toBe(4); // 3.6 -> ceil 4
  });

  it('passes through at zero markup', () => {
    expect(priceAiUnits(7_777, 0)).toBe(7_777);
  });

  it('rejects malformed inputs', () => {
    expect(() => priceAiUnits(1.5, 0)).toThrow();
    expect(() => priceAiUnits(100, -1)).toThrow();
  });
});

describe('DevInMemoryAiUsageMeter + registry', () => {
  it('records usage and reports it back in a snapshot', async () => {
    const meter = new DevInMemoryAiUsageMeter();
    await meter.record({
      tenantId: 't1',
      capability: 'RFQ_REPLY_DRAFT',
      currency: 'KES',
      costMinor: 2_500,
      at: '2026-11-11T00:00:00.000Z',
    });
    const snap = await meter.snapshot('t1', 'MONTH');
    expect(snap.periodUsedMinor).toBe(2_500);
    expect(snap.currency).toBe('KES');
  });

  it('a snapshot + decision round-trips through the meter (fail-closed cap)', async () => {
    const meter = new DevInMemoryAiUsageMeter();
    await meter.record({
      tenantId: 't1',
      capability: 'RFQ_REPLY_DRAFT',
      currency: 'KES',
      costMinor: 99_000,
      at: '2026-11-11T00:00:00.000Z',
    });
    const snap = await meter.snapshot('t1', 'MONTH');
    const d = evaluateAiSpend(cap, snap, { ...request, estimatedCostMinor: 2_000 });
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('CAP_EXCEEDED');
  });

  it('registry returns a dev meter by default (fail-safe)', () => {
    const reg = new AiUsageMeterRegistry();
    expect(reg.get().name).toBe('dev-in-memory');
  });
});
