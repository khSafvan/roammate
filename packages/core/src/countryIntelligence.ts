/**
 * Country intelligence registry — emergency numbers, power plugs, driving side, and travel utilities.
 * Zero-key, local data lookup with country code & destination keyword resolution.
 */

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  general?: string;
}

export interface PowerInfo {
  types: string[]; // e.g. ["C", "G"]
  voltage: string; // e.g. "230V"
  frequency: string; // e.g. "50Hz"
}

export interface CountryIntelligence {
  countryCode: string;
  name: string;
  callingCode: string;
  emergency: EmergencyNumbers;
  power: PowerInfo;
  drivingSide: 'left' | 'right';
  tipping: string;
  language: string;
}

const COUNTRY_REGISTRY: Record<string, CountryIntelligence> = {
  AE: {
    countryCode: 'AE',
    name: 'United Arab Emirates',
    callingCode: '+971',
    emergency: { police: '999', ambulance: '998', fire: '997', general: '112' },
    power: { types: ['G', 'C'], voltage: '220V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: '10–15% in restaurants is customary.',
    language: 'Arabic (English widely spoken)',
  },
  MY: {
    countryCode: 'MY',
    name: 'Malaysia',
    callingCode: '+60',
    emergency: { police: '999', ambulance: '999', fire: '994', general: '112' },
    power: { types: ['G'], voltage: '240V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: 'Tipping is not customary; 10% service charge often included.',
    language: 'Malay (English widely spoken)',
  },
  US: {
    countryCode: 'US',
    name: 'United States',
    callingCode: '+1',
    emergency: { police: '911', ambulance: '911', fire: '911' },
    power: { types: ['A', 'B'], voltage: '120V', frequency: '60Hz' },
    drivingSide: 'right',
    tipping: '18–22% standard in restaurants and bars.',
    language: 'English',
  },
  GB: {
    countryCode: 'GB',
    name: 'United Kingdom',
    callingCode: '+44',
    emergency: { police: '999', ambulance: '999', fire: '999', general: '112' },
    power: { types: ['G'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: '10–12.5% optional discretionary service.',
    language: 'English',
  },
  FR: {
    countryCode: 'FR',
    name: 'France',
    callingCode: '+33',
    emergency: { police: '17', ambulance: '15', fire: '18', general: '112' },
    power: { types: ['C', 'E'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: 'Service compris (included by law); round up small change.',
    language: 'French',
  },
  DE: {
    countryCode: 'DE',
    name: 'Germany',
    callingCode: '+49',
    emergency: { police: '110', ambulance: '112', fire: '112', general: '112' },
    power: { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: '5–10% rounded to the nearest euro is common.',
    language: 'German',
  },
  IT: {
    countryCode: 'IT',
    name: 'Italy',
    callingCode: '+39',
    emergency: { police: '113', ambulance: '118', fire: '115', general: '112' },
    power: { types: ['C', 'F', 'L'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: 'Coperto often charged; small tips (1–2€) appreciated.',
    language: 'Italian',
  },
  ES: {
    countryCode: 'ES',
    name: 'Spain',
    callingCode: '+34',
    emergency: { police: '091', ambulance: '061', fire: '080', general: '112' },
    power: { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: '5–10% optional for good service.',
    language: 'Spanish',
  },
  JP: {
    countryCode: 'JP',
    name: 'Japan',
    callingCode: '+81',
    emergency: { police: '110', ambulance: '119', fire: '119' },
    power: { types: ['A', 'B'], voltage: '100V', frequency: '50/60Hz' },
    drivingSide: 'left',
    tipping: 'No tipping. Tipping can be considered awkward or impolite.',
    language: 'Japanese',
  },
  TH: {
    countryCode: 'TH',
    name: 'Thailand',
    callingCode: '+66',
    emergency: { police: '191', ambulance: '1669', fire: '199', general: '1155 (Tourist Police)' },
    power: { types: ['A', 'B', 'C', 'O'], voltage: '220V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: 'Small tips (20–50 THB) or 10% appreciated.',
    language: 'Thai',
  },
  SG: {
    countryCode: 'SG',
    name: 'Singapore',
    callingCode: '+65',
    emergency: { police: '999', ambulance: '995', fire: '995' },
    power: { types: ['G'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: '10% service charge usually included in bills.',
    language: 'English, Mandarin, Malay, Tamil',
  },
  AU: {
    countryCode: 'AU',
    name: 'Australia',
    callingCode: '+61',
    emergency: { police: '000', ambulance: '000', fire: '000', general: '112 (mobile)' },
    power: { types: ['I'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: 'Not expected; 10% for exceptional dining service.',
    language: 'English',
  },
  CA: {
    countryCode: 'CA',
    name: 'Canada',
    callingCode: '+1',
    emergency: { police: '911', ambulance: '911', fire: '911' },
    power: { types: ['A', 'B'], voltage: '120V', frequency: '60Hz' },
    drivingSide: 'right',
    tipping: '15–20% standard in restaurants.',
    language: 'English, French',
  },
  CH: {
    countryCode: 'CH',
    name: 'Switzerland',
    callingCode: '+41',
    emergency: { police: '117', ambulance: '144', fire: '118', general: '112' },
    power: { types: ['J', 'C'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'right',
    tipping: 'Service included; rounding up to next franc is customary.',
    language: 'German, French, Italian, Romansh',
  },
  ID: {
    countryCode: 'ID',
    name: 'Indonesia',
    callingCode: '+62',
    emergency: { police: '110', ambulance: '118', fire: '113', general: '112' },
    power: { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' },
    drivingSide: 'left',
    tipping: '5–10% appreciated in restaurants; small tips for drivers.',
    language: 'Indonesian',
  },
};

const DESTINATION_KEYWORD_MAP: Record<string, string> = {
  dubai: 'AE',
  'abu dhabi': 'AE',
  uae: 'AE',
  malaysia: 'MY',
  'kuala lumpur': 'MY',
  langkawi: 'MY',
  penang: 'MY',
  paris: 'FR',
  france: 'FR',
  london: 'GB',
  uk: 'GB',
  britain: 'GB',
  tokyo: 'JP',
  kyoto: 'JP',
  osaka: 'JP',
  japan: 'JP',
  bangkok: 'TH',
  phuket: 'TH',
  thailand: 'TH',
  singapore: 'SG',
  sydney: 'AU',
  melbourne: 'AU',
  australia: 'AU',
  berlin: 'DE',
  munich: 'DE',
  germany: 'DE',
  rome: 'IT',
  florence: 'IT',
  venice: 'IT',
  italy: 'IT',
  madrid: 'ES',
  barcelona: 'ES',
  spain: 'ES',
  toronto: 'CA',
  vancouver: 'CA',
  canada: 'CA',
  bali: 'ID',
  indonesia: 'ID',
  zurich: 'CH',
  geneva: 'CH',
  switzerland: 'CH',
  'new york': 'US',
  california: 'US',
  hawaii: 'US',
  usa: 'US',
};

/**
 * Resolve country intelligence by ISO-2 country code or destination string query.
 */
export function getCountryIntelligence(
  countryCode?: string,
  destination?: string
): CountryIntelligence | null {
  if (countryCode) {
    const direct = COUNTRY_REGISTRY[countryCode.toUpperCase()];
    if (direct) return direct;
  }

  if (destination) {
    const lower = destination.toLowerCase();
    for (const [kw, code] of Object.entries(DESTINATION_KEYWORD_MAP)) {
      if (lower.includes(kw)) {
        return COUNTRY_REGISTRY[code] || null;
      }
    }
  }

  return null;
}

/**
 * Formats a clean pre-fill snippet for emergencyContacts & scratchpad.
 */
export function formatEmergencySnippet(info: CountryIntelligence): string {
  const lines: string[] = [
    `🚨 Emergency (${info.name}):`,
    `• Police: ${info.emergency.police}`,
    `• Ambulance: ${info.emergency.ambulance}`,
    `• Fire: ${info.emergency.fire}`,
  ];
  if (info.emergency.general) {
    lines.push(`• General Emergency: ${info.emergency.general}`);
  }
  lines.push(`• International Calling Code: ${info.callingCode}`);
  return lines.join('\n');
}

/**
 * Formats travel utility snippet (plugs, driving side, tipping, language).
 */
export function formatTravelUtilitySnippet(info: CountryIntelligence): string {
  return [
    `🔌 Power Plugs: Type ${info.power.types.join('/')} (${info.power.voltage}, ${info.power.frequency})`,
    `🚗 Driving: ${info.drivingSide.toUpperCase()}-hand side of road`,
    `🗣️ Language: ${info.language}`,
    `💵 Tipping: ${info.tipping}`,
  ].join('\n');
}
