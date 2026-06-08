/**
 * Normalizes string by lowering case, removing accents/diacritics, and stripping punctuation.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein Distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

/**
 * Calculates fuzzy match score between search query and target text
 * Higher score = stronger match
 */
export function calculateFuzzyScore(query: string, targetTitle: string, targetAddress = ''): number {
  const normQuery = normalizeString(query);
  const normTitle = normalizeString(targetTitle);
  const normAddress = normalizeString(targetAddress);

  if (!normQuery || !normTitle) return 0;

  // Exact match
  if (normTitle === normQuery) return 1000;

  // Starts with exact query
  if (normTitle.startsWith(normQuery)) return 800;

  // Substring match in title
  if (normTitle.includes(normQuery)) return 600;

  // Substring match in address
  if (normAddress.includes(normQuery)) return 400;

  // Token level matching
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const titleTokens = normTitle.split(' ').filter(Boolean);

  let tokenScore = 0;
  for (const qToken of queryTokens) {
    let bestTokenMatch = 0;
    for (const tToken of titleTokens) {
      if (tToken === qToken) {
        bestTokenMatch = 100;
      } else if (tToken.startsWith(qToken)) {
        bestTokenMatch = 80;
      } else if (tToken.includes(qToken)) {
        bestTokenMatch = 60;
      } else if (qToken.length >= 3 && tToken.length >= 3) {
        const dist = levenshteinDistance(qToken, tToken);
        const maxLen = Math.max(qToken.length, tToken.length);
        if (dist <= 2) {
          bestTokenMatch = Math.max(bestTokenMatch, 50 - dist * 15);
        } else if (dist / maxLen <= 0.4) {
          bestTokenMatch = Math.max(bestTokenMatch, 30);
        }
      }
    }
    tokenScore += bestTokenMatch;
  }

  // Full string Levenshtein fallback for typos (e.g. "burj khlifa" -> "burj khalifa")
  const fullDist = levenshteinDistance(normQuery, normTitle);
  if (fullDist <= 3 && normQuery.length >= 4) {
    tokenScore += 150 - fullDist * 30;
  }

  return tokenScore;
}

/**
 * Sorts candidates by fuzzy relevance score given a query string
 */
export function fuzzySortResults<T>(
  items: T[],
  query: string,
  getTitle: (item: T) => string,
  getAddress?: (item: T) => string
): T[] {
  const normQuery = normalizeString(query);
  if (!normQuery) return items;

  const scored = items.map((item) => {
    const title = getTitle(item);
    const address = getAddress ? getAddress(item) : '';
    const score = calculateFuzzyScore(normQuery, title, address);
    return { item, score };
  });

  // Filter out zero/negligible scores unless query is very short
  const filtered = normQuery.length <= 2 ? scored : scored.filter((s) => s.score > 20);

  return filtered.sort((a, b) => b.score - a.score).map((s) => s.item);
}
