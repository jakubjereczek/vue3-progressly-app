import SupabaseClient from '../supabase';
import type { TableRow } from '../supabase';
import type { TablesInsert, TablesUpdate } from '../db-types';
import { isFakeMode } from '@/lib/devMode';
import { FAKE_GOALS } from '@/lib/fakeData';

export default class GoalsService {
  public static async get(filter?: Partial<TableRow<'goals'>>): Promise<TableRow<'goals'>[]> {
    if (isFakeMode.value) return FAKE_GOALS;
    return (await SupabaseClient.get('goals', filter)) as TableRow<'goals'>[];
  }

  public static async insert(data: TablesInsert<'goals'>): Promise<TableRow<'goals'>> {
    return await SupabaseClient.insert('goals', data);
  }

  public static async update(
    updates: TablesUpdate<'goals'>,
    filter: Partial<TableRow<'goals'>>,
  ): Promise<TableRow<'goals'>> {
    return await SupabaseClient.update('goals', updates, filter);
  }

  public static async delete(filter: Partial<TableRow<'goals'>>): Promise<void> {
    await SupabaseClient.delete('goals', filter);
  }
}
