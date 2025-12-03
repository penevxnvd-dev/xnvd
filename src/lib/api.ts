// API Client - now uses Supabase directly
// This is a wrapper around supabaseApi for backward compatibility
import { supabaseApi } from './supabaseApi';

// Re-export supabaseApi as api for backward compatibility
export const api = supabaseApi;
