import { createClient, SupabaseClient as SupabaseBaseClient } from '@supabase/supabase-js';
import type { PostgrestResponse, User, Session } from '@supabase/supabase-js';

export default class SupabaseClient {
  private static instance: SupabaseBaseClient | null = null;

  public static init(url: string, anonKey: string) {
    if (this.instance) {
      return;
    } else {
      this.instance = createClient(url, anonKey);
    }
  }

  private static get client(): SupabaseBaseClient {
    if (!this.instance) {
      throw new Error('SupabaseClient not initialized');
    } else {
      return this.instance;
    }
  }

  public static async get<T = unknown>(table: string, columns = '*'): Promise<T[]> {
    const { data, error } = await this.client.from(table).select(columns);
    if (error) {
      throw error;
    } else {
      return data as T[];
    }
  }

  public static async insert<T = unknown>(table: string, payload: Partial<T> | Partial<T>[]): Promise<T[]> {
    const { data, error } = await this.client.from(table).insert(payload).select();
    if (error) {
      throw error;
    } else {
      return data as T[];
    }
  }

  public static async update<T = unknown>(
    table: string,
    payload: Partial<T>,
    filter: Record<string, unknown>,
  ): Promise<T[]> {
    let query = this.client.from(table).update(payload);
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.select();
    if (error) {
      throw error;
    } else {
      return data as T[];
    }
  }

  public static async delete<T = unknown>(
    table: string,
    filter: Record<string, unknown>,
  ): Promise<PostgrestResponse<T>> {
    let query = this.client.from(table).delete();
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    } else {
      return { data, error } as unknown as PostgrestResponse<T>;
    }
  }

  public static raw(): SupabaseBaseClient {
    return this.client;
  }

  public static async signUp(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) {
      throw error;
    } else {
      return data;
    }
  }

  public static async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    } else {
      return data;
    }
  }

  public static async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    } else {
      return;
    }
  }

  public static async getUser(): Promise<{ user: User | null }> {
    const { data } = await this.client.auth.getUser();
    return data;
  }

  public static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }
}
