import SupabaseClient from '../supabase';
import type { TableRow } from '../supabase';
import type { TablesInsert, TablesUpdate } from '../db-types';
import { isFakeMode } from '@/lib/devMode';
import { FAKE_CATEGORIES } from '@/lib/fakeData';

export default class CategoriesService {
  public static async get(filter?: Partial<TableRow<'categories'>>): Promise<TableRow<'categories'>[]> {
    if (isFakeMode.value) {
      // public categories have user_id: null; private have user_id set
      if (filter?.user_id === null) return [];
      return FAKE_CATEGORIES;
    }
    return (await SupabaseClient.get('categories', filter)) as TableRow<'categories'>[];
  }

  public static async insert(data: TablesInsert<'categories'>): Promise<TableRow<'categories'>> {
    return await SupabaseClient.insert('categories', data);
  }

  public static async update(
    updates: TablesUpdate<'categories'>,
    filter: Partial<TableRow<'categories'>>,
  ): Promise<TableRow<'categories'>> {
    return await SupabaseClient.update('categories', updates, filter);
  }

  public static async delete(filter: Partial<TableRow<'categories'>>): Promise<void> {
    await SupabaseClient.delete('categories', filter);
  }
}
