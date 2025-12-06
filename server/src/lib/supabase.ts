import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';

// Support both VITE_SUPABASE_URL and SUPABASE_URL for flexibility
// Priority: SUPABASE_URL > VITE_SUPABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// Support both VITE_SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY
// Also check for VITE_SUPABASE_ANON_KEY as fallback (some setups use anon key for service operations)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Fallback to anon key if service_role not available

// Support both VITE_SUPABASE_ANON_KEY and SUPABASE_ANON_KEY
// Priority: SUPABASE_ANON_KEY > VITE_SUPABASE_ANON_KEY > VITE_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY 
  || process.env.VITE_SUPABASE_ANON_KEY 
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing Supabase URL. Please set SUPABASE_URL or VITE_SUPABASE_URL in server/.env');
}

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'REPLACE_WITH_REAL_SERVICE_ROLE_KEY_FROM_DASHBOARD') {
  console.warn('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found or is placeholder.');
  console.warn('   Using anon key as fallback. Some admin operations may fail due to RLS policies.');
  console.warn('   For full functionality, set SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.warn('   Get it from: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api');
}

// Use anon key as fallback if service_role is not available
const finalServiceRoleKey = (SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'REPLACE_WITH_REAL_SERVICE_ROLE_KEY_FROM_DASHBOARD') 
  ? SUPABASE_SERVICE_ROLE_KEY 
  : SUPABASE_ANON_KEY;

// Service role client for admin operations (bypasses RLS)
// Uses service_role key if available, otherwise falls back to anon key
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  finalServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create a client for a specific user (respects RLS)
export function createSupabaseClient(authToken?: string) {
  const options: {
    auth: {
      autoRefreshToken: boolean;
      persistSession: boolean;
    };
    global?: {
      headers: {
        Authorization: string;
      };
    };
  } = {
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
    SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY!,
    options
  );
}


