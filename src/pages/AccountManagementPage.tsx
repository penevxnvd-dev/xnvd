import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { supabaseApi } from '@/lib/supabaseApi';
import { handleSupabaseError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';
import { 
  Plus, Trash2, Search, ArrowUp, Edit, UserX, UserCheck, Filter, 
  Eye, MoreVertical, Users, UserPlus, Shield, TrendingUp, Clock,
  CheckCircle2, XCircle, Mail, Calendar, MapPin, Building, Users as UsersIcon, User
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { trainingStructure, calculateTrainingProgress } from '@/data/trainingStructure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useUserRole } from '@/hooks/useUserRole';
import { hasPermission } from '@/utils/permissions';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsers, useInvalidateUsers, type User } from '@/hooks/useUsers';
import { useQueryClient } from '@tanstack/react-query';

const AccountManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, userId, loading: roleLoading } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [promoteToRole, setPromoteToRole] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [inactivityReason, setInactivityReason] = useState('');
  const [editUserData, setEditUserData] = useState({ fullName: '', email: '' });
  const [leaderTeamId, setLeaderTeamId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'trainee',
  });

  const isTeamLeader = role === 'team_leader';
  // Team leaders can now manage users (they have manage.users permission)
  const canFullManageUsers = !!role && hasPermission(role, 'manage.users');
  const canCreateUsers = !!role && (hasPermission(role, 'manage.users') || isTeamLeader);
  
  // Use React Query hook for users data
  const { data: users = [], isLoading: loading, error: usersError } = useUsers({
    canFullManageUsers,
    enabled: !roleLoading && (canFullManageUsers || isTeamLeader),
  });
  
  const invalidateUsers = useInvalidateUsers();

  useEffect(() => {
    if (roleLoading) return;
    
    if (!canCreateUsers) {
      toast.error('Нямате достъп до тази страница');
      navigate('/dashboard');
      return;
    }
  }, [roleLoading, canCreateUsers, navigate]);

  useEffect(() => {
    if (usersError) {
      const message = usersError instanceof Error ? usersError.message : 'Unknown error';
      toast.error(`Грешка при зареждане на потребители: ${message}`);
    }
  }, [usersError]);

  useEffect(() => {
    const loadTeam = async () => {
      if (!isTeamLeader || !userId) return;
      const team = await supabaseApi.getUserTeam(userId);
      setLeaderTeamId(team?.id ?? null);
    };
    loadTeam();
  }, [isTeamLeader, userId]);

  const handleCreateUser = useCallback(async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast.error('Моля попълнете всички полета');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Паролата трябва да е поне 6 символа');
      return;
    }

    setOperationLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabaseApi.supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
          },
        },
      });

      // Подобрена обработка на Supabase грешки
      if (signUpError) {
        // Проверка за специфични Supabase грешки
        const errorMessage = signUpError.message || '';
        if (errorMessage.includes('User already registered') || 
            errorMessage.includes('already registered') ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('email already')) {
          throw new Error('Потребител с този имейл вече съществува.');
        }
        if (errorMessage.includes('Password') || errorMessage.includes('password')) {
          throw new Error('Паролата не отговаря на изискванията. Моля използвайте поне 6 символа.');
        }
        if (errorMessage.includes('Email') || errorMessage.includes('email')) {
          throw new Error('Невалиден имейл адрес. Моля проверете формата.');
        }
        // Използвай handleSupabaseError за други грешки
        throw handleSupabaseError(signUpError);
      }
      
      if (!authData.user) {
        throw new Error('Неуспешно създаване на потребителски акаунт.');
      }

      const newUserId = authData.user.id;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: profile, error: profileError } = await supabaseApi.supabase
        .from('profiles')
        .select('id')
        .eq('id', newUserId)
        .single();

      if (profileError || !profile) {
        const { error: createProfileError } = await supabaseApi.supabase
          .from('profiles')
          .insert({
            id: newUserId,
            full_name: newUser.fullName,
            email: newUser.email,
            status: 'active',
          });

        if (createProfileError) {
          const profileErrorMessage = createProfileError.message || 'Неизвестна грешка';
          throw new Error(`Грешка при създаване на профил: ${profileErrorMessage}`);
        }
      } else {
        await supabaseApi.supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', newUserId);
      }

      if (isTeamLeader && newUser.role !== 'trainee' && newUser.role !== 'realtor') {
        throw new Error('Лидер на екип може да създава само Курсист или Реализатор');
      }

      const dbRole = newUser.role === 'trainee' ? 'realtor' : newUser.role;

      const { error: roleError } = await supabaseApi.supabase
        .from('user_roles')
        .insert({
          user_id: newUserId,
          role: dbRole as 'admin' | 'realtor' | 'team_leader' | 'office_manager' | 'regional_manager',
        });

      if (roleError && !roleError.message?.includes('duplicate')) {
        throw handleSupabaseError(roleError);
      }

      if (newUser.role === 'trainee' || newUser.role === 'realtor') {
        const { error: realtorError } = await supabaseApi.supabase
          .from('realtors')
          .insert({
            user_id: newUserId,
            team_id: isTeamLeader ? leaderTeamId : null,
            level: newUser.role === 'trainee' ? 1 : 3,
          });

        if (realtorError && !realtorError.message?.includes('duplicate') && !realtorError.message?.includes('unique')) {
          console.warn('Warning: Could not create realtor record:', realtorError);
        }
      }

      const roleDisplay = 
        newUser.role === 'admin' ? 'Администратор' :
        newUser.role === 'regional_manager' ? 'Регионален мениджър' :
        newUser.role === 'office_manager' ? 'Офис мениджър' :
        newUser.role === 'team_leader' ? 'Лидер на екип' :
        newUser.role === 'realtor' ? 'Реализатор' :
        newUser.role === 'trainee' ? 'Курсист' : newUser.role;
      toast.success(`Потребителят е създаден успешно като ${roleDisplay}`);
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', password: '', role: 'trainee' });
      invalidateUsers();
    } catch (error: unknown) {
      // Подобрена обработка на грешки
      let errorMessage = 'Грешка при създаване на потребител';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error && typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
      console.error('Error creating user:', error);
    } finally {
      setOperationLoading(false);
    }
  }, [newUser, isTeamLeader, leaderTeamId, canFullManageUsers, invalidateUsers]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;

    setOperationLoading(true);
    try {
      // First, delete from training_group_trainees by email (no foreign key constraint)
      if (selectedUser.email) {
        await supabaseApi.supabase
          .from('training_group_trainees')
          .delete()
          .eq('email', selectedUser.email);
      }

      // Then delete the profile (cascades to realtors, user_roles, etc.)
      const { error: profileError } = await supabaseApi.supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
      
      if (profileError) throw profileError;

      toast.success('Потребителят е изтрит успешно');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      invalidateUsers();
    } catch (error: unknown) {
      let errorMessage = 'Грешка при изтриване на потребител';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setOperationLoading(false);
    }
  }, [selectedUser, invalidateUsers]);

  const handlePromoteUser = useCallback(async () => {
    if (!selectedUser || !promoteToRole) return;

    setOperationLoading(true);
    try {
      const dbPromoteRole = promoteToRole === 'trainee' ? 'realtor' : promoteToRole;

      const { error: roleError } = await supabaseApi.supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: dbPromoteRole as 'admin' | 'realtor' | 'team_leader' | 'office_manager' | 'regional_manager',
        }, {
          onConflict: 'user_id'
        });
      
      if (roleError) throw roleError;

      if (promoteToRole === 'realtor' || promoteToRole === 'trainee') {
        const { data: existingRealtor } = await supabaseApi.supabase
          .from('realtors')
          .select('id, level')
          .eq('user_id', selectedUser.id)
          .maybeSingle();

        if (existingRealtor) {
          const newLevel = promoteToRole === 'trainee' ? 1 : 3;
          const { error: realtorError } = await supabaseApi.supabase
            .from('realtors')
            .update({ level: newLevel })
            .eq('id', existingRealtor.id);
          
          if (realtorError) throw realtorError;
        } else {
          const { error: createRealtorError } = await supabaseApi.supabase
            .from('realtors')
            .insert({
              user_id: selectedUser.id,
              team_id: null,
              level: promoteToRole === 'trainee' ? 1 : 3,
            });
          
          if (createRealtorError && !createRealtorError.message.includes('duplicate') && !createRealtorError.message.includes('unique')) {
            throw createRealtorError;
          }
        }
      }

      const roleDisplay = 
        promoteToRole === 'admin' ? 'Администратор' :
        promoteToRole === 'regional_manager' ? 'Регионален мениджър' :
        promoteToRole === 'office_manager' ? 'Офис мениджър' :
        promoteToRole === 'team_leader' ? 'Лидер на екип' :
        promoteToRole === 'realtor' ? 'Реализатор' :
        promoteToRole === 'trainee' ? 'Курсист' : promoteToRole;
      toast.success(`Потребителят е повишен до ${roleDisplay}`);
      setShowPromoteDialog(false);
      setSelectedUser(null);
      setPromoteToRole('');
      invalidateUsers();
    } catch (error: unknown) {
      let errorMessage = 'Грешка при повишаване на потребител';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setOperationLoading(false);
    }
  }, [selectedUser, promoteToRole, invalidateUsers]);

  const handleStatusChange = useCallback(async () => {
    if (!selectedUser) return;

    setOperationLoading(true);
    try {
      // Use userId if available, otherwise use id
      const profileId = selectedUser.userId || selectedUser.id;
      
      const updateData: { status: string; inactivity_reason?: string | null } = {
        status: newStatus,
      };

      if (newStatus === 'inactive' && inactivityReason.trim()) {
        updateData.inactivity_reason = inactivityReason.trim();
      } else if (newStatus === 'active') {
        updateData.inactivity_reason = null;
      }

      const { error } = await supabaseApi.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      toast.success(`Статусът е променен на ${newStatus === 'active' ? 'Активен' : 'Неактивен'}`);
      setShowStatusDialog(false);
      setSelectedUser(null);
      setNewStatus('active');
      setInactivityReason('');
      invalidateUsers();
    } catch (error: unknown) {
      let errorMessage = 'Грешка при промяна на статус';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setOperationLoading(false);
    }
  }, [selectedUser, newStatus, inactivityReason, invalidateUsers]);

  const handleEditUser = useCallback(async () => {
    if (!selectedUser || !editUserData.fullName || !editUserData.email) {
      toast.error('Моля попълнете всички полета');
      return;
    }

    setOperationLoading(true);
    try {
      const { error } = await supabaseApi.supabase
        .from('profiles')
        .update({
          full_name: editUserData.fullName,
          email: editUserData.email,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Потребителят е обновен успешно');
      setShowEditDialog(false);
      setSelectedUser(null);
      setEditUserData({ fullName: '', email: '' });
      invalidateUsers();
    } catch (error: unknown) {
      let errorMessage = 'Грешка при обновяване на потребител';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setOperationLoading(false);
    }
  }, [selectedUser, editUserData, invalidateUsers]);

  const loadAccountDetails = useCallback(async (user: User) => {
    if (!user.userId) {
      setAccountDetails({ ...user, error: 'Няма потребителски ID' });
      return;
    }

    setLoadingDetails(true);
    try {
      const details: any = {
        ...user,
      };

      const { data: profile } = await supabaseApi.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.userId)
        .single();

      if (profile) {
        details.profile = profile;
      }

      const { data: roles } = await supabaseApi.supabase
        .from('user_roles')
        .select('role, created_at')
        .eq('user_id', user.userId);

      details.roles = roles || [];

      if (user.realtorId || user.type === 'realtor' || user.type === 'trainee') {
        const { data: realtor } = await supabaseApi.supabase
          .from('realtors')
          .select('*')
          .eq('user_id', user.userId)
          .maybeSingle();

        if (realtor) {
          details.realtor = realtor;

          if (realtor.team_id) {
            const { data: team } = await supabaseApi.supabase
              .from('teams')
              .select('id, name, office_id')
              .eq('id', realtor.team_id)
              .single();

            if (team) {
              details.team = team;

              if (team.office_id) {
                const { data: office } = await supabaseApi.supabase
                  .from('offices')
                  .select('id, name, city_id, address')
                  .eq('id', team.office_id)
                  .single();

                if (office) {
                  details.office = office;

                  if (office.city_id) {
                    const { data: city } = await supabaseApi.supabase
                      .from('cities')
                      .select('id, name, country_id')
                      .eq('id', office.city_id)
                      .single();

                    if (city) {
                      details.city = city;

                      if (city.country_id) {
                        const { data: country } = await supabaseApi.supabase
                          .from('countries')
                          .select('id, name, code')
                          .eq('id', city.country_id)
                          .single();

                        if (country) {
                          details.country = country;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (user.userId) {
        try {
          const progressData = await supabaseApi.getTrainingProgress(user.userId);
          details.trainingProgress = progressData || [];
        } catch (error) {
          details.trainingProgress = [];
        }
      }

      if (details.realtor?.id) {
        const { count: dealsCount } = await supabaseApi.supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('realtor_id', details.realtor.id);
        details.dealsCount = dealsCount || 0;
      }

      if (details.realtor?.id) {
        const { count: diagnosesCount } = await supabaseApi.supabase
          .from('diagnoses')
          .select('*', { count: 'exact', head: true })
          .eq('realtor_id', details.realtor.id);
        details.diagnosesCount = diagnosesCount || 0;
      }

      setAccountDetails(details);
    } catch (error) {
      console.error('Error loading account details:', error);
      setAccountDetails({ ...user, error: 'Грешка при зареждане на детайли' });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleViewDetails = useCallback(async (user: User) => {
    setSelectedUser(user);
    setShowDetailsDialog(true);
    await loadAccountDetails(user);
  }, [loadAccountDetails]);

  // Memoize filtered users to prevent unnecessary recalculations
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && user.status === 'active') ||
        (statusFilter === 'inactive' && user.status === 'inactive');

      const matchesRole = 
        roleFilter === 'all' ||
        (roleFilter === 'trainee' && user.type === 'trainee') ||
        (roleFilter === 'realtor' && user.type === 'realtor') ||
        (roleFilter === user.role);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Memoize counts to prevent unnecessary recalculations
  // ВСИЧКИ HOOKS ТРЯБВА ДА СА ПРЕДИ УСЛОВНИТЕ RETURN STATEMENTS
  const { activeCount, inactiveCount, traineesCount, realtorsCount } = useMemo(() => ({
    activeCount: users.filter(u => u.status === 'active').length,
    inactiveCount: users.filter(u => u.status === 'inactive').length,
    traineesCount: users.filter(u => u.type === 'trainee').length,
    realtorsCount: users.filter(u => u.type === 'realtor').length,
  }), [users]);

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="text-center text-muted-foreground">Зареждане...</div>
        </div>
      </AppLayout>
    );
  }

  if (!canCreateUsers) {
    return null;
  }

  // Custom navbar content with header and stats
  const customNavbarContent = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-semibold text-foreground truncate">Управление на акаунти</h1>
          <button
                onClick={() => setShowCreateDialog(true)}
            className="group relative inline-flex items-center gap-2 px-4 py-1.5 h-8 rounded-lg bg-gradient-to-r from-primary via-primary/95 to-primary text-primary-foreground font-semibold text-sm shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0 overflow-hidden border border-primary/20 hover:border-primary/40"
          >
            {/* Animated background gradient */}
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></span>
            
            {/* Ripple effect on click */}
            <span className="absolute inset-0 rounded-lg bg-white/20 scale-0 group-active:scale-100 opacity-0 group-active:opacity-100 transition-all duration-500"></span>
            
            {/* Icon with bounce animation */}
            <UserPlus className="h-3.5 w-3.5 relative z-10 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300 ease-out" />
            
            {/* Text with slight movement */}
            <span className="hidden sm:inline relative z-10 group-hover:translate-x-0.5 transition-transform duration-300">Нов акаунт</span>
            
            {/* Glow effect */}
            <span className="absolute inset-0 rounded-lg bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>
          <div className="flex items-center gap-1.5 flex-wrap">
          {/* Общо акаунти */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all duration-200">
                  <div className="p-0.5 rounded-full bg-purple-500/20 dark:bg-purple-400/20 group-hover:bg-purple-500/30 dark:group-hover:bg-purple-400/30 transition-colors">
                    <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{users.length}</span>
                  <span className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80 hidden lg:inline">Общо</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Общо акаунти: {users.length}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Активни */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all duration-200">
                  <div className="p-0.5 rounded-full bg-green-500/20 dark:bg-green-400/20 group-hover:bg-green-500/30 dark:group-hover:bg-green-400/30 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">{activeCount}</span>
                  <span className="text-[10px] font-medium text-green-600/80 dark:text-green-400/80 hidden lg:inline">Активни</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Активни акаунти: {activeCount}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Курсисти */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border border-yellow-200/60 dark:border-yellow-800/40 hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-sm transition-all duration-200">
                  <div className="p-0.5 rounded-full bg-yellow-500/20 dark:bg-yellow-400/20 group-hover:bg-yellow-500/30 dark:group-hover:bg-yellow-400/30 transition-colors">
                    <TrendingUp className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{traineesCount}</span>
                  <span className="text-[10px] font-medium text-yellow-600/80 dark:text-yellow-400/80 hidden lg:inline">Курсисти</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Курсисти: {traineesCount}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Реализатори */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/15 dark:to-primary/20 border border-primary/30 dark:border-primary/40 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md hover:shadow-primary/20 transition-all duration-300 cursor-pointer">
                  <div className="relative p-1 rounded-md bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-primary/20 dark:border-primary/30 group-hover:border-primary/40 dark:group-hover:border-primary/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <img 
                      src={logo} 
                      alt="Logo" 
                      className="h-4 w-4 object-contain transition-transform duration-300" 
                    />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-bold text-primary leading-tight">{realtorsCount}</span>
                    <span className="text-[10px] font-medium text-primary/70 dark:text-primary/60 hidden lg:block leading-tight">Реализатори</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Реализатори: {realtorsCount}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <AppLayout customNavbarContent={customNavbarContent}>
      <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] w-full bg-gradient-to-b from-background to-muted/20 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl w-full">
          {/* Search and Filters */}
          <div className="bg-card border rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Търси по име или имейл..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                    />
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[140px] h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички статуси</SelectItem>
                    <SelectItem value="active">Активни ({activeCount})</SelectItem>
                    <SelectItem value="inactive">Неактивни ({inactiveCount})</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[160px] h-11">
                    <SelectValue placeholder="Всички роли" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички роли</SelectItem>
                    <SelectItem value="trainee">Курсисти</SelectItem>
                    <SelectItem value="realtor">Реализатори</SelectItem>
                    <SelectItem value="team_leader">Лидери на екип</SelectItem>
                    <SelectItem value="office_manager">Офис мениджъри</SelectItem>
                    <SelectItem value="regional_manager">Регионални мениджъри</SelectItem>
                    <SelectItem value="admin">Администратори</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
                  </div>

                  {/* Users List */}
          <div className="space-y-3 pb-4">
                    {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        Зареждане...
                      </div>
                    ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'Няма намерени потребители' : 'Няма потребители'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Опитайте с различна търсена дума' : 'Създайте първия акаунт'}
                </p>
                      </div>
                    ) : (
              <>
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                      className={cn(
                        "group flex items-center justify-between p-5 border rounded-xl transition-all duration-200 cursor-pointer",
                        user.status === 'inactive' 
                          ? "bg-muted/30 border-muted opacity-75 hover:opacity-100" 
                          : "bg-gradient-to-r from-card to-card/50 hover:from-card/80 hover:to-card/60 border-border hover:border-primary/50 hover:shadow-lg"
                      )}
                      onClick={() => handleViewDetails(user)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className={cn(
                          "h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-md",
                          user.status === 'active' 
                            ? "bg-gradient-to-br from-primary to-primary/70" 
                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                        )}>
                          {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        {/* User Info */}
                            <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-lg">{formatNameWithEmoji(user.fullName)}</h3>
                            <Badge 
                              variant={user.status === 'active' ? 'default' : 'secondary'}
                              className={cn(
                                "text-xs font-medium",
                                user.status === 'active' 
                                  ? "bg-green-500 hover:bg-green-600 text-white" 
                                  : "bg-gray-500 hover:bg-gray-600 text-white"
                              )}
                            >
                              {user.status === 'active' ? 'Активен' : 'Неактивен'}
                            </Badge>
                            {/* Show level badge for realtors/trainees */}
                            {(user.type === 'realtor' || user.type === 'trainee' || user.level !== undefined) && (
                              <Badge 
                                variant={user.level === 5 ? 'default' : user.level === 3 ? 'default' : 'secondary'}
                                className={cn(
                                  "text-xs font-medium",
                                  user.level === 5 && "bg-orange-500 hover:bg-orange-600 text-white",
                                  user.level === 3 && "bg-blue-500 hover:bg-blue-600 text-white",
                                  (user.level === 1 || user.type === 'trainee') && "bg-yellow-500 hover:bg-yellow-600 text-white"
                                )}
                              >
                                {user.level === 5 ? 'Елит' :
                                 user.level === 3 ? 'Реализатор' :
                                 user.level === 1 || user.type === 'trainee' ? 'Курсист' :
                                 user.type === 'realtor' ? 'Реализатор' : 'Курсист'}
                              </Badge>
                            )}
                            {/* Show role badge only for non-realtor roles */}
                            {user.role && user.role !== 'realtor' && user.role !== 'trainee' && (
                              <Badge variant="outline" className="text-xs">
                                {user.role === 'admin' ? 'Администратор' : 
                                       user.role === 'regional_manager' ? 'Регионален мениджър' :
                                       user.role === 'office_manager' ? 'Офис мениджър' :
                                 user.role === 'team_leader' ? 'Лидер на екип' : 'Няма роля'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(user.createdAt).toLocaleDateString('bg-BG')}</span>
                              </div>
                            )}
                          </div>
                          {user.inactivityReason && (
                            <p className="text-xs text-destructive mb-2">
                              <XCircle className="h-3 w-3 inline mr-1" />
                              {user.inactivityReason}
                            </p>
                          )}
                          {user.totalSubsections !== undefined && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Завършени {user.completedSubsections || 0} от {user.totalSubsections} подточки
                                </span>
                                <span className="font-bold text-primary">
                                  {user.progress || 0}%
                                </span>
                            </div>
                              <Progress 
                                value={user.progress || 0} 
                                className="h-2.5"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                            {canFullManageUsers && (
                        <div 
                          className="flex items-center gap-2 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                                title="Действия"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(user);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Виж детайли
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setEditUserData({ fullName: user.fullName, email: user.email });
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Редактирай акаунт
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setNewStatus(user.status === 'active' ? 'inactive' : 'active');
                                  setInactivityReason(user.inactivityReason || '');
                                  setShowStatusDialog(true);
                                }}
                                className={cn(
                                  user.status === 'active' ? "text-orange-600" : "text-green-600"
                                )}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Деактивирай акаунт
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Активирай акаунт
                                  </>
                                )}
                              </DropdownMenuItem>

                              {user.type === 'trainee' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(user);
                                      setPromoteToRole('realtor');
                                      setShowPromoteDialog(true);
                                    }}
                                    className="text-blue-600"
                                  >
                                    <ArrowUp className="h-4 w-4 mr-2" />
                                    Повиши до Реализатор
                                  </DropdownMenuItem>
                                </>
                              )}

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                    setSelectedUser(user);
                                    setPromoteToRole('');
                                    setShowPromoteDialog(true);
                                  }}
                                >
                                <ArrowUp className="h-4 w-4 mr-2" />
                                  Промени роля
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                    setSelectedUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                className="text-destructive focus:text-destructive"
                                >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Изтрий акаунт
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                              </div>
                            )}
                          </div>
                        ))}
                </>
              )}
                </div>
            </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Създай нов акаунт
            </DialogTitle>
            <DialogDescription>
              Попълнете данните за новия потребител
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-fullName">Име и фамилия *</Label>
              <Input
                id="new-fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="Иван Иванов"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Имейл *</Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="ivan@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Парола *</Label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Минимум 6 символа"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Роля *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trainee">Курсист (Новобранец)</SelectItem>
                  <SelectItem value="realtor">Реализатор</SelectItem>
                  {!isTeamLeader && <SelectItem value="team_leader">Лидер на екип</SelectItem>}
                  {!isTeamLeader && <SelectItem value="office_manager">Офис мениджър</SelectItem>}
                  {!isTeamLeader && <SelectItem value="regional_manager">Регионален мениджър</SelectItem>}
                  {!isTeamLeader && <SelectItem value="admin">Администратор</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="flex-1"
            >
              Отказ
            </Button>
            <Button onClick={handleCreateUser} disabled={operationLoading} className="flex-1">
              {operationLoading ? 'Създаване...' : 'Създай'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Редактирай акаунт
            </DialogTitle>
            <DialogDescription>
              Редактирайте данните на потребителя
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Име и фамилия *</Label>
              <Input
                id="edit-fullName"
                value={editUserData.fullName}
                onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                placeholder="Иван Иванов"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Имейл *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                placeholder="ivan@example.com"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditUserData({ fullName: '', email: '' });
              }}
              className="flex-1"
            >
              Отказ
            </Button>
            <Button onClick={handleEditUser} disabled={operationLoading} className="flex-1">
              {operationLoading ? 'Запазване...' : 'Запази'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.status === 'active' ? (
                <UserX className="h-5 w-5 text-orange-600" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-600" />
              )}
              {selectedUser?.status === 'active' ? 'Деактивирай акаунт' : 'Активирай акаунт'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.status === 'active' 
                ? 'Променете статуса на акаунта на неактивен' 
                : 'Променете статуса на акаунта на активен'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Статус *</Label>
              <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'inactive' && (
              <div className="space-y-2">
                <Label htmlFor="inactivity-reason">Причина за неактивност *</Label>
                <Textarea
                  id="inactivity-reason"
                  value={inactivityReason}
                  onChange={(e) => setInactivityReason(e.target.value)}
                  placeholder="Опишете причината за деактивиране на акаунта..."
                  rows={4}
                  required
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setNewStatus('active');
                setInactivityReason('');
              }}
              className="flex-1"
            >
              Отказ
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={operationLoading || (newStatus === 'inactive' && !inactivityReason.trim())}
              className="flex-1"
            >
              {operationLoading ? 'Запазване...' : 'Запази'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote User Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5" />
              {selectedUser?.type === 'trainee' && !promoteToRole 
                ? 'Повиши от Курсист до Реализатор' 
                : 'Промени роля'}
            </DialogTitle>
            <DialogDescription>
              Изберете нова роля за потребителя
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Потребител</Label>
              <div className="p-3 border rounded-md bg-muted/50">
                <p className="font-medium">{selectedUser ? formatNameWithEmoji(selectedUser.fullName) : ''}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Текуща роля: {selectedUser?.role === 'admin' ? 'Администратор' : 
                                 selectedUser?.role === 'regional_manager' ? 'Регионален мениджър' :
                                 selectedUser?.role === 'office_manager' ? 'Офис мениджър' :
                                 selectedUser?.role === 'team_leader' ? 'Лидер на екип' :
                                 selectedUser?.role === 'realtor' ? 'Реализатор' : 
                                 selectedUser?.role === 'trainee' ? 'Курсист' : selectedUser?.role || 'Няма роля'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-role">Нова роля *</Label>
              <Select
                value={promoteToRole}
                onValueChange={setPromoteToRole}
              >
                <SelectTrigger id="promote-role">
                  <SelectValue placeholder="Избери роля" />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser?.type === 'trainee' && (
                    <SelectItem value="realtor">Реализатор (Повишение)</SelectItem>
                  )}
                  <SelectItem value="trainee">Курсист</SelectItem>
                  <SelectItem value="realtor">Реализатор</SelectItem>
                  {!isTeamLeader && <SelectItem value="team_leader">Ръководител на екип</SelectItem>}
                  {!isTeamLeader && <SelectItem value="office_manager">Мениджър на офис</SelectItem>}
                  {!isTeamLeader && <SelectItem value="regional_manager">Регионален мениджър</SelectItem>}
                  {!isTeamLeader && <SelectItem value="admin">Администратор</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPromoteDialog(false);
                setSelectedUser(null);
                setPromoteToRole('');
              }}
              className="flex-1"
            >
              Отказ
            </Button>
            <Button
              onClick={handlePromoteUser}
              disabled={operationLoading || !promoteToRole}
              className="flex-1"
            >
              {operationLoading ? 'Променяне...' : 'Промени'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Детайли на акаунт</DialogTitle>
            <DialogDescription>
              Пълна информация за потребителя
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick Actions Bar */}
          {canFullManageUsers && accountDetails && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg mb-4 border border-primary/20 flex-wrap gap-2">
              <span className="text-sm font-semibold">Бързи действия:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setSelectedUser(accountDetails);
                    setEditUserData({ fullName: accountDetails.fullName, email: accountDetails.email });
                    setShowEditDialog(true);
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Редактирай
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setSelectedUser(accountDetails);
                    setNewStatus(accountDetails.status === 'active' ? 'inactive' : 'active');
                    setInactivityReason(accountDetails.inactivityReason || '');
                    setShowStatusDialog(true);
                  }}
                  className={cn(
                    "gap-2",
                    accountDetails.status === 'active' ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"
                  )}
                >
                  {accountDetails.status === 'active' ? (
                    <>
                      <UserX className="h-4 w-4" />
                      Деактивирай
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Активирай
                    </>
                  )}
                </Button>
                {accountDetails.type === 'trainee' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setSelectedUser(accountDetails);
                      setPromoteToRole('realtor');
                      setShowPromoteDialog(true);
                    }}
                    className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Повиши до Реализатор
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setSelectedUser(accountDetails);
                    setPromoteToRole('');
                    setShowPromoteDialog(true);
                  }}
                  className="gap-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  Промени роля
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setSelectedUser(accountDetails);
                    setShowDeleteDialog(true);
                  }}
                  className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Изтрий
                </Button>
              </div>
            </div>
          )}

          {loadingDetails ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Зареждане на детайли...
            </div>
          ) : accountDetails?.error ? (
            <div className="py-8 text-center text-destructive">
              {accountDetails.error}
            </div>
          ) : accountDetails ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Общ преглед</TabsTrigger>
                <TabsTrigger value="training">Обучение</TabsTrigger>
                <TabsTrigger value="organization">Организация</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Основна информация
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Име и фамилия</Label>
                      <p className="font-medium text-lg">{formatNameWithEmoji(accountDetails.fullName)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Имейл</Label>
                      <p className="font-medium">{accountDetails.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Статус</Label>
                      <div className="mt-1">
                        <Badge 
                          variant={accountDetails.status === 'active' ? 'default' : 'secondary'}
                          className={cn(
                            accountDetails.status === 'active' 
                              ? "bg-green-500 hover:bg-green-600" 
                              : "bg-gray-500 hover:bg-gray-600"
                          )}
                        >
                          {accountDetails.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Роля</Label>
                      <p className="font-medium">
                        {accountDetails.role === 'admin' ? 'Администратор' : 
                         accountDetails.role === 'regional_manager' ? 'Регионален мениджър' :
                         accountDetails.role === 'office_manager' ? 'Офис мениджър' :
                         accountDetails.role === 'team_leader' ? 'Лидер на екип' :
                         accountDetails.role === 'realtor' ? 'Реализатор' : 
                         accountDetails.role === 'trainee' ? 'Курсист' : 'Няма роля'}
                      </p>
                    </div>
                    {accountDetails.createdAt && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Дата на създаване</Label>
                        <p className="font-medium">
                          {new Date(accountDetails.createdAt).toLocaleDateString('bg-BG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {accountDetails.inactivityReason && (
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Причина за неактивност</Label>
                        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{accountDetails.inactivityReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Realtor Information */}
                {accountDetails.realtor && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Информация за реализатор
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Ниво</Label>
                          <p className="font-medium text-lg">
                            {accountDetails.realtor.level === 1 ? 'Чирак' :
                             accountDetails.realtor.level === 3 ? 'Реализатор' :
                             accountDetails.realtor.level === 5 ? 'Елит' :
                             `Ниво ${accountDetails.realtor.level}`}
                          </p>
                        </div>
                        {accountDetails.realtor.hire_date && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Дата на наемане</Label>
                            <p className="font-medium">
                              {new Date(accountDetails.realtor.hire_date).toLocaleDateString('bg-BG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Лични качества</Label>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {accountDetails.realtor.confidence && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Увереност
                              </Badge>
                            )}
                            {accountDetails.realtor.sales_resilience && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Търговски непукизъм
                              </Badge>
                            )}
                            {accountDetails.realtor.success_mindset && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Успешен начин на мислене
                              </Badge>
                            )}
                            {!accountDetails.realtor.confidence && !accountDetails.realtor.sales_resilience && !accountDetails.realtor.success_mindset && (
                              <span className="text-xs text-muted-foreground">Няма отбелязани качества</span>
                            )}
                          </div>
                        </div>
                        {accountDetails.dealsCount !== undefined && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Брой сделки</Label>
                            <p className="font-medium text-lg">{accountDetails.dealsCount}</p>
                          </div>
                        )}
                        {accountDetails.diagnosesCount !== undefined && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Брой диагнози</Label>
                            <p className="font-medium text-lg">{accountDetails.diagnosesCount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="training" className="space-y-6 mt-6">
                {accountDetails.totalSubsections !== undefined ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Прогрес в обучението
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Завършени {accountDetails.completedSubsections || 0} от {accountDetails.totalSubsections} подточки
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {accountDetails.progress || 0}%
                          </span>
                        </div>
                        <Progress value={accountDetails.progress || 0} className="h-3" />
                      </div>
                      {accountDetails.trainingProgress && accountDetails.trainingProgress.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Детайли на прогреса</Label>
                          <div className="text-sm text-muted-foreground">
                            <p>Общо записи за прогрес: {accountDetails.trainingProgress.length}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Няма данни за обучение
                  </div>
                )}
              </TabsContent>

              <TabsContent value="organization" className="space-y-6 mt-6">
                {(accountDetails.team || accountDetails.office || accountDetails.city || accountDetails.country) ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Организационна структура
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accountDetails.country && (
                        <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Държава
                          </Label>
                          <p className="font-medium">{accountDetails.country.name} ({accountDetails.country.code})</p>
                        </div>
                      )}
                      {accountDetails.city && (
                        <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Град
                          </Label>
                          <p className="font-medium">{accountDetails.city.name}</p>
                        </div>
                      )}
                      {accountDetails.office && (
                        <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            Офис
                          </Label>
                          <p className="font-medium">{accountDetails.office.name}</p>
                          {accountDetails.office.address && (
                            <p className="text-xs text-muted-foreground mt-1">{accountDetails.office.address}</p>
                          )}
                        </div>
                      )}
                      {accountDetails.team && (
                        <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            Екип
                          </Label>
                          <p className="font-medium">{accountDetails.team.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Няма организационна информация
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false);
                setAccountDetails(null);
              }}
              className="flex-1"
            >
              Затвори
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Потвърждение за изтриване</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете акаунта на "{selectedUser ? formatNameWithEmoji(selectedUser.fullName) : ''}"? 
              Това действие не може да бъде отменено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground"
            >
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AccountManagementPage;
