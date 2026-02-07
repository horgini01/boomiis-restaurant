/**
 * Highlight search terms in text
 * @param text - The text to highlight
 * @param search - The search term to highlight
 * @returns JSX with highlighted portions
 */
export function highlightSearchTerm(text: string | null | undefined, search: string): React.ReactNode {
  if (!text || !search) return text || '';

  const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === search.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
}

/**
 * Escape special regex characters in search term
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains search term (case-insensitive)
 */
export function containsSearchTerm(text: string | null | undefined, search: string): boolean {
  if (!text || !search) return false;
  return text.toLowerCase().includes(search.toLowerCase());
}

/**
 * Calculate relevance score for search results
 * Higher score = more relevant
 */
export function calculateRelevanceScore(
  log: {
    userName?: string | null;
    entityName?: string | null;
    ipAddress?: string | null;
    changes?: string | null;
    entityId?: string | null;
  },
  search: string
): number {
  if (!search) return 0;

  let score = 0;
  const searchLower = search.toLowerCase();

  // Exact match in userName (highest priority)
  if (log.userName?.toLowerCase() === searchLower) score += 100;
  else if (log.userName?.toLowerCase().includes(searchLower)) score += 50;

  // Exact match in entityName
  if (log.entityName?.toLowerCase() === searchLower) score += 80;
  else if (log.entityName?.toLowerCase().includes(searchLower)) score += 40;

  // Match in IP address
  if (log.ipAddress?.toLowerCase().includes(searchLower)) score += 30;

  // Match in entity ID
  if (log.entityId?.toLowerCase() === searchLower) score += 60;
  else if (log.entityId?.toLowerCase().includes(searchLower)) score += 20;

  // Match in changes (lowest priority)
  if (log.changes?.toLowerCase().includes(searchLower)) score += 10;

  return score;
}
