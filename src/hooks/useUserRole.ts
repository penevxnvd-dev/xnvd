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
        // Check if token exists first
        const token = localStorage.getItem('token');
        if (!token) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        // Fetch user data using API client
        const { user: userData } = await api.getCurrentUser();
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
        // Clear invalid token
        localStorage.removeItem('token');
        setRole(null);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return { role, loading, userId };
};