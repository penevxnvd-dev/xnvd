// Centralized error handling for Supabase errors
export const handleSupabaseError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error('An unknown error occurred');
  }

  const errorMessage = error.message || '';
  const errorCode = (error as { code?: string; status?: number; statusCode?: number }).code;
  const statusCode = (error as { status?: number; statusCode?: number }).status || 
                     (error as { status?: number; statusCode?: number }).statusCode;

  // 403 Forbidden errors (RLS policy violations)
  if (statusCode === 403 || errorCode === 'PGRST301' || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
    if (errorMessage.includes('JWT') || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
      return new Error('Access denied. You may not be authenticated or do not have permission to access this resource. Please log in and try again.');
    }
    return new Error('Access denied. You do not have permission to access this resource. Please check your user role and permissions.');
  }

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

