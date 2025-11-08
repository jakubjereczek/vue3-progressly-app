import SupabaseClient from './api';

function preload() {
  const url = import.meta.env.VITE_APP_SUPABASE_PROJECT_URL;
  const key = import.meta.env.VITE_APP_SUPABASE_API_KEY;

  SupabaseClient.init(url, key);
  console.log('Supabase client initialized')
}

export default preload;
