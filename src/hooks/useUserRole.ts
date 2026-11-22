import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'realtor' | 'team_leader' | 'office_manager' | 'regional_manager' | 'trainee' | null;

const CACHE_KEY_ROLE = 'userRole';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

interface CachedData {
  role: UserRole;
  userId: string;
  permissions: {
    canManageUsers: boolean;
    canViewTraining: boolean;
    canViewHierarchy: boolean;
  };
  timestamp: number;
}

const getCachedData = (): CachedData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY_ROLE);
    if (!cached) return null;
    
    const data: CachedData = JSON.parse(cached);
    
    // Провери дали кешът е изтекъл
    if (Date.now() - data.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY_ROLE);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedData = (role: UserRole, userId: string, permissions: CachedData['permissions']) => {
  if (typeof window === 'undefined') return;
  
  try {
    const data: CachedData = {
      role,
      userId,
      permissions,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_ROLE, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching user data:', error);
  }
};

const clearCache = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY_ROLE);
};

const calculatePermissions = (role: UserRole) => {
  return {
    canManageUsers: role === 'admin',
    canViewTraining: !!role && ['admin', 'regional_manager', 'office_manager', 'team_leader', 'realtor', 'trainee'].includes(role),
    canViewHierarchy: !!role && ['admin', 'regional_manager', 'office_manager', 'team_leader', 'realtor', 'trainee'].includes(role),
  };
};

export const useUserRole = () => {
  // Зареди от кеш веднага при инициализация
  const cached = getCachedData();
  
  const [role, setRole] = useState<UserRole>(cached?.role || null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(cached?.userId || null);

  useEffect(() => {
    const fetchUserRoleFromDB = async () => {
      try {
        // Get current user from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setRole(null);
          setUserId(null);
          clearCache();
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
        }

        let determinedRole: UserRole = null;

        if (roles && roles.length > 0) {
          // Priority: admin > regional_manager > office_manager > team_leader > realtor
          const rolePriority = ['admin', 'regional_manager', 'office_manager', 'team_leader', 'realtor', 'trainee'];
          
          for (const priorityRole of rolePriority) {
            if (roles.some(r => r.role === priorityRole)) {
              determinedRole = priorityRole as UserRole;
              break;
            }
          }
        } else {
          // If no role in user_roles, check if user is a realtor
          const { data: realtor, error: realtorError } = await supabase
            .from('realtors')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (realtorError && realtorError.code !== 'PGRST116') {
            console.error('[useUserRole] Error checking realtor status:', realtorError);
          }

          if (realtor) {
            determinedRole = 'realtor';
          }
        }

        // Изчисли permissions
        const permissions = calculatePermissions(determinedRole);

        setRole(determinedRole);
        
        // Кеширай данните
        if (determinedRole) {
          setCachedData(determinedRole, user.id, permissions);
        } else {
          clearCache();
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setUserId(null);
        clearCache();
      }
    };

    const fetchUserRole = async () => {
      try {
        // Ако има валиден кеш, използвай го и провери в background
        const cached = getCachedData();
        if (cached && cached.role && cached.userId) {
          setRole(cached.role);
          setUserId(cached.userId);
          setLoading(false);
          
          // Провери в background дали ролята е актуална (без да блокира UI)
          fetchUserRoleFromDB().catch(console.error);
          return;
        }

        // Ако няма кеш, зареди от базата данни
        await fetchUserRoleFromDB();
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setUserId(null);
        clearCache();
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
        clearCache();
        setLoading(false);
      } else {
        // При промяна на сесия, изчисти кеша и зареди отново
        clearCache();
        fetchUserRole();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading, userId };
};
