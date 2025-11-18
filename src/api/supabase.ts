import { createClient, SupabaseClient as SupabaseBaseClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';
import type { Database, TablesInsert, TablesUpdate } from './db-types';

export type PublicTables = keyof Database['public']['Tables'];
export type TableRow<T extends PublicTables> = Database['public']['Tables'][T]['Row'];

export default class SupabaseClient {
  private static instance: SupabaseBaseClient<Database> | null = null;

  public static init(url: string, anonKey: string) {
    if (this.instance) {
      return;
    } else {
      this.instance = createClient<Database>(url, anonKey);
    }
  }

  private static get client(): SupabaseBaseClient<Database> {
    if (!this.instance) {
      throw new Error('SupabaseClient not initialized');
    } else {
      return this.instance;
    }
  }

  public static async get<T extends PublicTables>(
    table: T,
    filter?: Partial<TableRow<T>>,
    single: boolean = false,
  ): Promise<TableRow<T>[] | TableRow<T> | null> {
    let query = this.client.from(table).select('*');
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
      });
    }
    if (single) {
      const { data, error } = await query.single();
      if (error) {
        throw error;
      }
      return data as unknown as TableRow<T> | null;
    } else {
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data as unknown as TableRow<T>[];
    }
  }

  public static async insert<T extends PublicTables>(table: T, row: TablesInsert<T>): Promise<TableRow<T>> {
    // @ts-expect-error Supabase typings do not fully capture TableInsert<T>
    const { data, error } = await this.client.from(table).insert(row).select().single();
    if (error) {
      throw error;
    }
    return data as unknown as TableRow<T>;
  }

  public static async update<T extends PublicTables>(
    table: T,
    updates: TablesUpdate<T>,
    filter: Partial<TableRow<T>>,
  ): Promise<TableRow<T>> {
    // @ts-expect-error Supabase typings do not fully capture TableUpdate<T>
    let query = this.client.from(table).update(updates).select();
    Object.entries(filter).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value);
      }
    });
    const { data, error } = await query.single();
    if (error) {
      throw error;
    }
    return data as unknown as TableRow<T>;
  }

  public static async delete<T extends PublicTables>(table: T, filter: Partial<TableRow<T>>): Promise<TableRow<T>> {
    let query = this.client.from(table).delete().select();
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query.single();
    if (error) {
      throw error;
    }
    return data as unknown as TableRow<T>;
  }

  public static raw(): SupabaseBaseClient<Database> {
    if (!this.instance) {
      throw new Error('SupabaseClient not initialized');
    } else {
      return this.client;
    }
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

  public static async getSession(): Promise<{ session: Session | null }> {
    const { data } = await this.client.auth.getSession();
    return data;
  }

  public static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }
}
