import { describe, expect, it } from 'vitest';

import { availabilityHeadline, summarizeAvailability } from './search-availability';

const at = (county?: string) => ({ location: county ? { county } : undefined });

describe('summarizeAvailability', () => {
  it('lists only counties that really have a match, most matches first', () => {
    const summary = summarizeAvailability([at('Nakuru'), at('Kiambu'), at('Nakuru'), at(' Nakuru '), at('Bungoma'), at()]);
    expect(summary.total).toBe(6);
    expect(summary.places).toEqual([
      { county: 'Nakuru', count: 3 },
      { county: 'Bungoma', count: 1 },
      { county: 'Kiambu', count: 1 },
    ]);
    expect(summary.unplaced).toBe(1);
  });

  it('never invents a place when nothing matches', () => {
    expect(summarizeAvailability([])).toEqual({ total: 0, places: [], unplaced: 0 });
  });
});

describe('availabilityHeadline', () => {
  it('says how many businesses in how many counties', () => {
    expect(availabilityHeadline(' Beans ', summarizeAvailability([at('Nakuru'), at('Kiambu'), at('Nakuru')]))).toBe(
      '“Beans”: 3 businesses in 2 counties.',
    );
    expect(availabilityHeadline('Beans', summarizeAvailability([at('Nakuru')]))).toBe('“Beans”: 1 business in 1 county.');
    expect(availabilityHeadline('Beans', summarizeAvailability([at()]))).toBe('“Beans”: 1 business in Kenya.');
    expect(availabilityHeadline('Beans', summarizeAvailability([]))).toBe('No business has “Beans” yet.');
  });
});
