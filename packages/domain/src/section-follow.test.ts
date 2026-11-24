import { describe, expect, it } from 'vitest';
import { pickCurrentSection } from './section-follow';

const boxes = [
  { id: 'business', top: -400, bottom: 80 },
  { id: 'adverts', top: 80, bottom: 700 },
  { id: 'leads', top: 700, bottom: 1300 }
];

describe('pickCurrentSection (menu follows the page, 24/11/26)', () => {
  it('marks the section that crosses the reading line', () => {
    expect(pickCurrentSection(boxes, { line: 120 })).toBe('adverts');
  });
  it('marks the first section before any reaches the line', () => {
    expect(pickCurrentSection([{ id: 'a', top: 300, bottom: 900 }, { id: 'b', top: 900, bottom: 1500 }])).toBe('a');
  });
  it('marks the last section on screen at the end of the page', () => {
    expect(pickCurrentSection(boxes, { atPageEnd: true, viewportHeight: 1400 })).toBe('leads');
  });
  it('keeps the last passed section in a gap between sections', () => {
    expect(pickCurrentSection([{ id: 'a', top: -500, bottom: 50 }, { id: 'b', top: 200, bottom: 900 }], { line: 120 })).toBe('a');
  });
  it('ignores hidden sections and returns null when none are present', () => {
    expect(pickCurrentSection([{ id: 'x', top: 0, bottom: 0 }])).toBeNull();
  });
  it('does not depend on the order the sections are given', () => {
    expect(pickCurrentSection([...boxes].reverse(), { line: 120 })).toBe('adverts');
  });
});
