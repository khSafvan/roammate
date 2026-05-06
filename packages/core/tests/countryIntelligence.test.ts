import { describe, it, expect } from 'vitest';
import {
  getCountryIntelligence,
  formatEmergencySnippet,
  formatTravelUtilitySnippet,
} from '@mojolog/core';

describe('countryIntelligence — getCountryIntelligence lookup', () => {
  it('resolves country by explicit ISO-2 code', () => {
    const uae = getCountryIntelligence('AE');
    expect(uae).not.toBeNull();
    expect(uae?.name).toBe('United Arab Emirates');
    expect(uae?.emergency.police).toBe('999');
    expect(uae?.callingCode).toBe('+971');

    const my = getCountryIntelligence('my');
    expect(my).not.toBeNull();
    expect(my?.name).toBe('Malaysia');
    expect(my?.drivingSide).toBe('left');
  });

  it('resolves country by destination keyword fallback', () => {
    const tokyo = getCountryIntelligence(undefined, 'Tokyo & Kyoto 7-Day Trip');
    expect(tokyo).not.toBeNull();
    expect(tokyo?.countryCode).toBe('JP');
    expect(tokyo?.emergency.police).toBe('110');

    const paris = getCountryIntelligence(undefined, 'Paris, France Autumn Holiday');
    expect(paris).not.toBeNull();
    expect(paris?.countryCode).toBe('FR');
    expect(paris?.emergency.general).toBe('112');
  });

  it('returns null for unknown destination and code', () => {
    const unknown = getCountryIntelligence('ZZ', 'Atlantis Underwater City');
    expect(unknown).toBeNull();
  });
});

describe('countryIntelligence — snippet formatters', () => {
  it('formats emergency numbers cleanly', () => {
    const info = getCountryIntelligence('AE')!;
    const snippet = formatEmergencySnippet(info);
    expect(snippet).toContain('🚨 Emergency (United Arab Emirates):');
    expect(snippet).toContain('• Police: 999');
    expect(snippet).toContain('• International Calling Code: +971');
  });

  it('formats power and utility info accurately', () => {
    const info = getCountryIntelligence('GB')!;
    const snippet = formatTravelUtilitySnippet(info);
    expect(snippet).toContain('🔌 Power Plugs: Type G');
    expect(snippet).toContain('🚗 Driving: LEFT-hand side');
  });
});
