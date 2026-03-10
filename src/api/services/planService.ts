import SupabaseClient from '../supabase';
import type { TableRow } from '../supabase';

export interface PlanInfo {
  name: string;
  categoryLimit: number | null;
  dailyActivitiesLimit: number | null;
}

export default class PlanService {
  public static async getByUserId(userId: string): Promise<PlanInfo | null> {
    const { data, error } = await SupabaseClient.raw()
      .from('profiles')
      .select('plans(name, category_limit, daily_activities_limit)')
      .eq('id', userId)
      .single();

    if (error || !data?.plans) return null;

    const p = data.plans as TableRow<'plans'>;

    return {
      name: p.name,
      categoryLimit: p.category_limit,
      dailyActivitiesLimit: p.daily_activities_limit,
    };
  }
}
