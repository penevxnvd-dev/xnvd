import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'realtor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Get current user from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Check user roles from user_roles table
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          // Don't return early - check realtors table as fallback
        }

        if (roles && roles.length > 0) {
          // Priority: admin > realtor
          const hasAdmin = roles.some(r => r.role === 'admin');
          const determinedRole = hasAdmin ? 'admin' : 'realtor';
          console.log(`[useUserRole] Found role in user_roles: ${determinedRole}`);
          setRole(determinedRole);
        } else {
          // If no role in user_roles, check if user is a realtor
          console.log('[useUserRole] No role in user_roles, checking realtors table...');
          const { data: realtor, error: realtorError } = await supabase
            .from('realtors')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (realtorError) {
            if (realtorError.code === 'PGRST116') {
              // No realtor found - this is expected if user is not a realtor
              console.log('[useUserRole] User is not a realtor');
            } else {
              console.error('[useUserRole] Error checking realtor status:', realtorError);
            }
          }

          if (realtor) {
            // User is a realtor but doesn't have role in user_roles
            console.log('[useUserRole] User is a realtor (found in realtors table)');
            setRole('realtor');
          } else {
            console.log('[useUserRole] User has no role assigned');
            setRole(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole(null);
        setUserId(null);
        setLoading(false);
      } else {
        fetchUserRole();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading, userId };
};
