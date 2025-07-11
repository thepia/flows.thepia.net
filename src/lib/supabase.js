import { createClient } from '@supabase/supabase-js';

// Use PUBLIC_ prefix for client-side access in Astro
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'api',
  },
});
