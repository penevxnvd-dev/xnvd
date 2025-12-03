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
          setRole(null);
          setLoading(false);
          return;
        }

        if (roles && roles.length > 0) {
          // Priority: admin > realtor
          const hasAdmin = roles.some(r => r.role === 'admin');
          setRole(hasAdmin ? 'admin' : 'realtor');
        } else {
          setRole(null);
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
