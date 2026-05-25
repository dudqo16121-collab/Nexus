import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bhlpzukxvweiyucckqiv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_puXQ-YJQRWtGvplcRPdXPw_4dK_o6aM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});