import type { TableRow } from '@/api/supabase';

/**
 * Builds a Map from category id → full category row for O(1) lookups.
 */
export function buildCategoryMap(categories: TableRow<'categories'>[]): Map<string, TableRow<'categories'>> {
  return new Map(categories.map((c) => [c.id, c]));
}
