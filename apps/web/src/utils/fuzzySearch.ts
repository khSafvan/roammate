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

/**
 * Filters and sorts candidates by simple substring inclusion.
 * Kept the signature same to avoid breaking callers.
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
    const title = normalizeString(getTitle(item));
    const address = getAddress ? normalizeString(getAddress(item)) : '';
    
    let score = 0;
    if (title === normQuery) score = 1000;
    else if (title.startsWith(normQuery)) score = 800;
    else if (title.includes(normQuery)) score = 600;
    else if (address.includes(normQuery)) score = 400;

    return { item, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.item);
}
