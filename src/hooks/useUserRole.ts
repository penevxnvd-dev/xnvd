import { useState, useEffect } from 'react';
import { supabaseApi } from '@/lib/supabaseApi';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'realtor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        const { user: userData } = await supabaseApi.getCurrentUser();
        if (!userData) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(userData.id);

        // Check user role
        if (userData.roles && userData.roles.length > 0) {
          setRole(userData.roles[0] as UserRole);
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
      if (session) {
        fetchUserRole();
      } else {
        setRole(null);
        setUserId(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading, userId };
};