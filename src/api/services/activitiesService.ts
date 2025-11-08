import SupabaseClient from '../supabase';
import type { TableRow, TableInsert, TableUpdate } from '../supabase';

export default class ActivitiesService {
  public static async get(
    filter?: Partial<TableRow<'activities'>>,
    single: boolean = false
  ): Promise<TableRow<'activities'> | TableRow<'activities'>[] | undefined> {
    try {
      const activity = await SupabaseClient.get('activities', filter, single);
      if (activity) {
        return activity;
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching activities:', error);
      return undefined;
    }
  }

  public static async insert(
    activity: TableInsert<'activities'>
  ): Promise<TableRow<'activities'> | undefined> {
    try {
      return await SupabaseClient.insert('activities', activity);
    } catch (error) {
      console.error('Error inserting activity:', error);
      return undefined;
    }
  }

  public static async update(
    updates: TableUpdate<'activities'>,
    filter: Partial<TableRow<'activities'>>
  ): Promise<TableRow<'activities'> | undefined> {
    try {
      return await SupabaseClient.update('activities', updates, filter);
    } catch (error) {
      console.error('Error updating activity:', error);
      return undefined;
    }
  }

  public static async delete(
    filter: Partial<TableRow<'activities'>>
  ): Promise<TableRow<'activities'> | undefined> {
    try {
      return await SupabaseClient.delete('activities', filter);
    } catch (error) {
      console.error('Error deleting activity:', error);
      return undefined;
    }
  }
}
