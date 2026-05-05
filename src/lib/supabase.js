import { createClient } from '@supabase/supabase-js';
import { getSessionToken } from './sessionToken';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus diisi di file .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      get 'x-session-token'() {
        return getSessionToken();
      },
    },
  },
});
