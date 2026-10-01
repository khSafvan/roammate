/**
 * Minimal string normalizer and filter logic
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

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

export function calculateFuzzyScore(query: string, target: string): number {
  const nQuery = normalizeString(query);
  const nTarget = normalizeString(target);
  if (!nQuery || !nTarget) return 0;
  if (nQuery === nTarget) return 1000;
  if (nTarget.startsWith(nQuery)) return 800;
  if (nTarget.includes(nQuery)) return 600;

  const dist = levenshteinDistance(nQuery, nTarget);
  const maxLen = Math.max(nQuery.length, nTarget.length);
  const similarity = 1 - dist / maxLen;
  if (similarity > 0.5) {
    return Math.round(similarity * 500);
  }
  return 0;
}

/**
 * Filters and sorts candidates by fuzzy score.
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
    const titleScore = calculateFuzzyScore(normQuery, getTitle(item));
    const addressScore = getAddress ? calculateFuzzyScore(normQuery, getAddress(item)) * 0.6 : 0;
    const score = Math.max(titleScore, addressScore);

    return { item, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.item);
}
