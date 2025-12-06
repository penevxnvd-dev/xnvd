// Centralized error handling for Supabase errors
export const handleSupabaseError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error('An unknown error occurred');
  }

  const errorMessage = error.message || '';
  const errorCode = (error as { code?: string }).code;

  // RLS / Authentication errors
  if (errorCode === 'PGRST301' || errorMessage.includes('JWT') || errorMessage.includes('permission denied')) {
    return new Error('Not authenticated. Please log in.');
  }
  
  // Row Level Security errors
  if (errorCode === '42501' || errorMessage.includes('row-level security')) {
    return new Error('Access denied. You do not have permission to access this resource.');
  }
  
  // Network errors
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return new Error('Network error. Please check your connection and try again.');
  }
  
  // Return original error if no specific handling
  return error;
};

