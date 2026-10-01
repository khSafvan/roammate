import { StopCategory } from '@roammate/shared';

export interface PlaceClassificationInput {
  name?: string;
  title?: string;
  address?: string;
  osmClass?: string;
  osmType?: string;
}

export type ActivitySubType =
  | 'theme_park'
  | 'water_park'
  | 'aquarium'
  | 'observation_deck'
  | 'museum'
  | 'tour'
  | 'zoo'
  | 'attraction';

export interface PlaceCategoryInference {
  category: StopCategory;
  subType?: ActivitySubType | 'hotel' | 'resort' | 'restaurant' | 'cafe' | 'bar' | 'airport' | 'transit';
  isThemeParkOrAttraction: boolean;
  isHotel: boolean;
  isFlight: boolean;
  label: string;
  emoji: string;
  suggestedStayAnchor: boolean;
}

const PATTERNS = {
  THEME_PARKS: /\b(theme\s*park|amusement|ferrari\s*world|warner\s*bros|img\s*worlds|legoland|disney|universal\s*studios|six\s*flags|motiongate)\b/i,
  WATER_PARKS: /\b(water\s*park|waterpark|aquaventure|wild\s*wadi|yas\s*waterworld|aqua\s*fun)\b/i,
  OBSERVATION_DECKS: /\b(at\s*the\s*top|observation\s*deck|sky\s*views?|view\s*at\s*the\s*palm|aura\s*skypool|ain\s*dubai|london\s*eye|observatory)\b/i,
  MUSEUMS: /\b(museum|louvre|qasr\s*al\s*watan|gallery|exhibition|heritage\s*village|al\s*shindagha)\b/i,
  SAFARI_ZOO_AQUARIUM: /\b(safari|dune\s*bashing|zoo|aquarium|lost\s*chambers|sea\s*world|seaworld)\b/i,
  HOTELS: /\b(hotel|resort|suites?|inn\b|hostel|motel|villa|lodge|airbnb|guesthouse|hilton|marriott|hyatt|sheraton|sofitel|radisson|four\s*seasons|ritz[\s-]carlton|palace\s*downtown|atlantis|burj\s*al\s*arab|jumeirah|waldorf|st\.?\s*regis|shangri[\s-]la|kempinski|rotana|novotel)\b/i,
  DINING: /\b(restaurant|caf[eé]|coffee|bistro|bakery|grill|bar\b|pub\b|lounge|kitchen|diner|pizzeria|sushi|buffet|steakhouse|roastery|nobu|zou\s*zou|al\s*khayma|ce\s*la\s*vi|atmosphere|salt)\b/i,
  AIRPORT: /\b(airport|aerodrome|terminal\s*[1-4]|emirates\s*terminal|\b(dxb|auh|jfk|lhr|cdg|sin|hnd|nrt|doh|fra|ams)\b)\b/i,
  TRANSIT: /\b(metro|subway|bus\s*station|train\s*station|ferry|tram|water\s*bus|abra)\b/i,
};

export function isThemeParkOrAttraction(name: string, osmClass?: string, osmType?: string): boolean {
  const normClass = (osmClass || '').toLowerCase();
  const normType = (osmType || '').toLowerCase();
  if (normClass === 'tourism' && ['theme_park', 'attraction', 'aquarium', 'zoo'].includes(normType)) return true;
  if (normClass === 'leisure' && ['water_park', 'amusement_arcade', 'theme_park'].includes(normType)) return true;
  return PATTERNS.THEME_PARKS.test(name) || PATTERNS.WATER_PARKS.test(name) || PATTERNS.OBSERVATION_DECKS.test(name) || PATTERNS.SAFARI_ZOO_AQUARIUM.test(name);
}

export function inferPlaceCategory(input: PlaceClassificationInput): PlaceCategoryInference {
  const text = `${input.name || input.title || ''} ${input.address || ''}`.trim();
  const osmClass = (input.osmClass || '').toLowerCase().trim();
  const osmType = (input.osmType || '').toLowerCase().trim();

  // Water park
  if (osmType === 'water_park' || PATTERNS.WATER_PARKS.test(text)) {
    return { category: 'sight', subType: 'water_park', isThemeParkOrAttraction: true, isHotel: false, isFlight: false, label: 'Waterpark', emoji: '🏊', suggestedStayAnchor: false };
  }
  // Theme park
  if (osmType === 'theme_park' || osmType === 'amusement_arcade' || PATTERNS.THEME_PARKS.test(text)) {
    return { category: 'sight', subType: 'theme_park', isThemeParkOrAttraction: true, isHotel: false, isFlight: false, label: 'Theme Park', emoji: '🎢', suggestedStayAnchor: false };
  }
  // Observation deck
  if (PATTERNS.OBSERVATION_DECKS.test(text)) {
    return { category: 'sight', subType: 'observation_deck', isThemeParkOrAttraction: true, isHotel: false, isFlight: false, label: 'Observation Deck', emoji: '🏙️', suggestedStayAnchor: false };
  }
  // Aquarium / Safari / Zoo
  if (['aquarium', 'zoo'].includes(osmType) || PATTERNS.SAFARI_ZOO_AQUARIUM.test(text)) {
    const isAqua = /aquarium|lost\s*chambers|sea\s*world|seaworld/i.test(text) || osmType === 'aquarium';
    const isZoo = /zoo/i.test(text) || osmType === 'zoo';
    return { category: 'sight', subType: isAqua ? 'aquarium' : isZoo ? 'zoo' : 'tour', isThemeParkOrAttraction: true, isHotel: false, isFlight: false, label: isAqua ? 'Aquarium' : isZoo ? 'Zoo' : 'Safari / Tour', emoji: isAqua ? '🐠' : isZoo ? '🦁' : '🏜️', suggestedStayAnchor: false };
  }
  // Museum
  if (['museum', 'gallery'].includes(osmType) || PATTERNS.MUSEUMS.test(text)) {
    return { category: 'sight', subType: 'museum', isThemeParkOrAttraction: true, isHotel: false, isFlight: false, label: 'Museum & Culture', emoji: '🏛️', suggestedStayAnchor: false };
  }
  // Airport / Flight
  const name = (input.name || input.title || '').trim();
  if (osmClass === 'aeroway' || ['aerodrome', 'airport', 'terminal'].includes(osmType) || PATTERNS.AIRPORT.test(name) || PATTERNS.AIRPORT.test(text)) {
    return { category: 'flight', subType: 'airport', isThemeParkOrAttraction: false, isHotel: false, isFlight: true, label: 'Flight & Airport', emoji: '✈️', suggestedStayAnchor: false };
  }

  // Dining (Check name first so a restaurant like "Nobu Dubai" inside "Atlantis The Palm" is correctly dining)
  if ((osmClass === 'amenity' && ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bistro'].includes(osmType)) || PATTERNS.DINING.test(name)) {
    const isCafe = /caf[eé]|coffee|bakery/i.test(text) || osmType === 'cafe';
    return { category: 'dining', subType: isCafe ? 'cafe' : 'restaurant', isThemeParkOrAttraction: false, isHotel: false, isFlight: false, label: isCafe ? 'Cafe' : 'Dining', emoji: isCafe ? '☕' : '🍜', suggestedStayAnchor: false };
  }

  // Hotel / Lodging
  if (['hotel', 'motel', 'guest_house', 'hostel', 'resort', 'apartment'].includes(osmType) || PATTERNS.HOTELS.test(text)) {
    return { category: 'lodging', subType: /resort/i.test(text) ? 'resort' : 'hotel', isThemeParkOrAttraction: false, isHotel: true, isFlight: false, label: 'Hotel & Stay', emoji: '🏨', suggestedStayAnchor: true };
  }

  // General dining fallback
  if (PATTERNS.DINING.test(text)) {
    const isCafe = /caf[eé]|coffee|bakery/i.test(text);
    return { category: 'dining', subType: isCafe ? 'cafe' : 'restaurant', isThemeParkOrAttraction: false, isHotel: false, isFlight: false, label: isCafe ? 'Cafe' : 'Dining', emoji: isCafe ? '☕' : '🍜', suggestedStayAnchor: false };
  }
  // Transit
  if (['station', 'bus_station', 'ferry_terminal', 'subway_entrance'].includes(osmType) || osmClass === 'railway' || osmClass === 'public_transport' || PATTERNS.TRANSIT.test(text)) {
    return { category: 'transit', subType: 'transit', isThemeParkOrAttraction: false, isHotel: false, isFlight: false, label: 'Transit Station', emoji: '🚆', suggestedStayAnchor: false };
  }
  // Dining
  if ((osmClass === 'amenity' && ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bistro'].includes(osmType)) || PATTERNS.DINING.test(text)) {
    const isCafe = /caf[eé]|coffee|bakery/i.test(text) || osmType === 'cafe';
    return { category: 'dining', subType: isCafe ? 'cafe' : 'restaurant', isThemeParkOrAttraction: false, isHotel: false, isFlight: false, label: isCafe ? 'Cafe' : 'Dining', emoji: isCafe ? '☕' : '🍜', suggestedStayAnchor: false };
  }

  return { category: 'sight', subType: 'attraction', isThemeParkOrAttraction: false, isHotel: false, isFlight: false, label: 'Attraction', emoji: '🏛️', suggestedStayAnchor: false };
}
