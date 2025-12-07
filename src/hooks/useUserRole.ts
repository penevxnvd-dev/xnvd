import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'realtor' | 'team_leader' | 'office_manager' | 'regional_manager' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Check for hardcoded session first
        const hardcodedSession = localStorage.getItem('hardcoded-session');
        if (hardcodedSession) {
          try {
            const session = JSON.parse(hardcodedSession);
            if (session.user && session.hardcoded) {
              console.log('[useUserRole] Found hardcoded session for user:', session.user.id);
              const { getHardcodedUserRoles } = await import('@/lib/hardcodedData');
              const userRoles = getHardcodedUserRoles().filter(ur => ur.user_id === session.user.id);
              
              console.log('[useUserRole] Hardcoded user roles:', userRoles);
              
              if (userRoles && userRoles.length > 0) {
                const rolePriority = ['admin', 'regional_manager', 'office_manager', 'team_leader', 'realtor'];
                for (const priorityRole of rolePriority) {
                  if (userRoles.some(r => r.role === priorityRole)) {
                    console.log('[useUserRole] Setting role from hardcoded data:', priorityRole);
                    setRole(priorityRole as UserRole);
                    setUserId(session.user.id);
                    setLoading(false);
                    return; // Exit early - don't check Supabase
                  }
                }
              } else {
                console.warn('[useUserRole] No roles found for hardcoded user:', session.user.id);
                // Even if no roles found, set userId so dashboard can show error
                setUserId(session.user.id);
                setRole(null);
                setLoading(false);
                return; // Exit early - don't check Supabase
              }
            }
          } catch (e) {
            console.error('[useUserRole] Error processing hardcoded session:', e);
            // Invalid hardcoded session, clear it
            localStorage.removeItem('hardcoded-session');
          }
        }

        // Get current user from Supabase auth (only if no hardcoded session)
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
          // Priority: admin > regional_manager > office_manager > team_leader > realtor
          const rolePriority = ['admin', 'regional_manager', 'office_manager', 'team_leader', 'realtor'];
          let determinedRole: UserRole = null;
          
          for (const priorityRole of rolePriority) {
            if (roles.some(r => r.role === priorityRole)) {
              determinedRole = priorityRole as UserRole;
              break;
            }
          }
          
          if (determinedRole) {
            console.log(`[useUserRole] Found role in user_roles: ${determinedRole}`);
            setRole(determinedRole);
          }
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

    // Listen for auth state changes (only if not using hardcoded session)
    const hardcodedSession = localStorage.getItem('hardcoded-session');
    if (!hardcodedSession) {
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
    }
    
    // If using hardcoded session, don't subscribe to auth changes
    return () => {};
  }, []);

  return { role, loading, userId };
};
