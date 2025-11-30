import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create a client for a specific user (respects RLS)
export function createSupabaseClient(authToken?: string) {
  const options: any = {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  };

  if (authToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    };
  }

  return createClient<Database>(
    SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY!,
    options
  );
}


