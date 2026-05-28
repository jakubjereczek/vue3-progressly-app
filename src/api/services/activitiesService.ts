import type { TablesInsert, TablesUpdate } from '../db-types';
import SupabaseClient from '../supabase';
import type { TableRow } from '../supabase';
import { isFakeMode } from '@/lib/devMode';
import { FAKE_ACTIVITIES } from '@/lib/fakeData';

export default class ActivitiesService {
  public static async get(
    filter?: Partial<TableRow<'activities'>>,
    single: boolean = false,
  ): Promise<TableRow<'activities'> | TableRow<'activities'>[] | undefined> {
    if (isFakeMode.value) {
      // In fake mode: no pending activity, all-time returns fake set
      if (filter?.finished_at === null) return undefined; // no in-progress fake activity
      return single ? FAKE_ACTIVITIES[0] : FAKE_ACTIVITIES;
    }
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

  public static async delete(filter: Partial<TableRow<'activities'>>): Promise<void> {
    await SupabaseClient.delete('activities', filter);
  }

  public static async getInRange(userId: string, from: Date, to: Date): Promise<TableRow<'activities'>[]> {
    if (isFakeMode.value) {
      return FAKE_ACTIVITIES.filter((a) => a.started_at >= from.toISOString() && a.started_at <= to.toISOString()).sort(
        (a, b) => b.started_at.localeCompare(a.started_at),
      );
    }
    const { data, error } = await SupabaseClient.raw()
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', from.toISOString())
      .lte('started_at', to.toISOString())
      .order('started_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []) as TableRow<'activities'>[];
  }

  public static async getAll(userId: string): Promise<TableRow<'activities'>[]> {
    if (isFakeMode.value) {
      return [...FAKE_ACTIVITIES].sort((a, b) => b.started_at.localeCompare(a.started_at));
    }
    const { data, error } = await SupabaseClient.raw()
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TableRow<'activities'>[];
  }
}
