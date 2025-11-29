import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export type UserRole = 'admin' | 'realtor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { user } = await api.getCurrentUser();
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Check user role
        if (user.roles && user.roles.length > 0) {
          setRole(user.roles[0] as UserRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Check for token changes periodically
    const interval = setInterval(fetchUserRole, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return { role, loading, userId };
};