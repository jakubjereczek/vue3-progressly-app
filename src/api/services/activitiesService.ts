import type { TablesInsert, TablesUpdate } from '../db-types';
import SupabaseClient from '../supabase';
import type { TableRow } from '../supabase';

export default class ActivitiesService {
  public static async get(
    filter?: Partial<TableRow<'activities'>>,
    single: boolean = false,
  ): Promise<TableRow<'activities'> | TableRow<'activities'>[] | undefined> {
    return (await SupabaseClient.get('activities', filter, single)) ?? undefined;
  }

  public static async insert(activity: TablesInsert<'activities'>): Promise<TableRow<'activities'> | undefined> {
    return await SupabaseClient.insert('activities', activity);
  }

  public static async update(
    updates: TablesUpdate<'activities'>,
    filter: Partial<TableRow<'activities'>>,
  ): Promise<TableRow<'activities'> | undefined> {
    return await SupabaseClient.update('activities', updates, filter);
  }

  public static async delete(filter: Partial<TableRow<'activities'>>): Promise<TableRow<'activities'> | undefined> {
    return await SupabaseClient.delete('activities', filter);
  }
}
