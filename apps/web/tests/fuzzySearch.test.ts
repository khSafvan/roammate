import { describe, expect, it } from 'vitest';
import { calculateFuzzyScore, fuzzySortResults, levenshteinDistance, normalizeString } from '../src/utils/fuzzySearch';

describe('fuzzySearch Utility', () => {
  it('normalizes string correctly', () => {
    expect(normalizeString('  Sēnso-ji  Têmple!  ')).toBe('senso ji temple');
    expect(normalizeString('Café & Bistro')).toBe('cafe bistro');
  });

  it('calculates Levenshtein distance correctly', () => {
    expect(levenshteinDistance('dubai', 'duba')).toBe(1);
    expect(levenshteinDistance('eiffel', 'eifel')).toBe(1);
    expect(levenshteinDistance('same', 'same')).toBe(0);
  });

  it('calculates fuzzy match scores with title and address weighting', () => {
    const exact = calculateFuzzyScore('Burj Khalifa', 'Burj Khalifa');
    const typo = calculateFuzzyScore('Burj Khlifa', 'Burj Khalifa');
    const partial = calculateFuzzyScore('duba', 'Dubai Mall');
    const mismatch = calculateFuzzyScore('Tokyo Skytree', 'Louvre Museum Paris');

    expect(exact).toBeGreaterThan(typo);
    expect(typo).toBeGreaterThan(0);
    expect(partial).toBeGreaterThan(0);
    expect(mismatch).toBe(0);
  });

  it('sorts search candidates by fuzzy relevance', () => {
    const places = [
      { title: 'Louvre Museum', address: 'Paris, France' },
      { title: 'Burj Khalifa', address: '1 1 Sheikh Mohammed bin Rashid Blvd - Dubai' },
      { title: 'Burj Al Arab', address: 'Jumeirah St - Dubai' },
    ];

    const sorted = fuzzySortResults(places, 'burj khlifa', (p) => p.title, (p) => p.address);
    expect(sorted[0].title).toBe('Burj Khalifa');
  });
});
