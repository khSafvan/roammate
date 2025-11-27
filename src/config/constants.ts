/**
 * MojoLog Central Configuration & Constants
 */

// LocalStorage Persistence Keys
export const STORAGE_KEYS = {
  VAULT_SESSION: 'mojolog_vault_session',
  USER_PREFIX: 'mojolog_user_',
  TRIP_PREFIX: 'mojolog_trip_',
} as const;

// 3-Month Inactivity Retention Policy (90 days in milliseconds)
export const RETENTION_POLICY = {
  INACTIVITY_PRUNE_MS: 90 * 24 * 60 * 60 * 1000,
  DAYS: 90,
} as const;

// Cryptographic Seed & Vault Configuration
export const AUTH_CONFIG = {
  ENTROPY_BITS: 128, // 12-word BIP-39 mnemonic
  DELETE_CONFIRM_KEYWORD: 'DELETE',
} as const;

// Cartography & Map Settings (Terraink Minimalist Vector Engine)
export const MAP_CONFIG = {
  TILE_STYLE_URL: 'https://tiles.openfreemap.org/styles/positron',
  DEFAULT_CENTER: {
    longitude: 139.7005,
    latitude: 35.6895,
  },
  DEFAULT_ZOOM: 12.5,
  PADDING: {
    top: 45,
    bottom: 45,
    left: 45,
    right: 45,
  },
} as const;

// Transit & Multi-Modal Distance Modeling
export const TRANSIT_CONFIG = {
  EARTH_RADIUS_KM: 6371,
  ROAD_WINDING_FACTOR: 1.25, // Urban road curvature factor
  MODES: {
    walk: {
      speedKmH: 4.5,
      bufferMins: 0,
      minMins: 3,
    },
    transit: {
      speedKmH: 30.0,
      bufferMins: 5.0, // Transit station wait buffer
      minMins: 6,
    },
    drive: {
      speedKmH: 24.0, // City driving speed
      bufferMins: 2.0, // Traffic light buffer
      minMins: 4,
    },
  },
} as const;

// UI Feedback Timers
export const UI_CONFIG = {
  CLIPBOARD_FEEDBACK_MS: 2500,
  MAP_FLY_DURATION_MS: 500,
  MAP_FIT_DURATION_MS: 700,
} as const;
