// Centralized error handling for Supabase errors
export const handleSupabaseError = (error: any): Error => {
  // RLS / Authentication errors
  if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('permission denied')) {
    return new Error('Not authenticated. Please log in.');
  }
  
  // Row Level Security errors
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return new Error('Access denied. You do not have permission to access this resource.');
  }
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return new Error('Network error. Please check your connection and try again.');
  }
  
  // Return original error if no specific handling
  return error instanceof Error ? error : new Error(error.message || 'An error occurred');
};

