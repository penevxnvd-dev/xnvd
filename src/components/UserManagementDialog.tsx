import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabaseApi } from '@/lib/supabaseApi';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Search, ArrowUp, ArrowDown } from 'lucide-react';
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

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export const UserManagementDialog = ({
  open,
  onOpenChange,
  onUpdate,
}: UserManagementDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [promoteToRole, setPromoteToRole] = useState<string>('');
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'trainee', // Default to trainee for new recruits
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles with their roles
      const { data: profiles, error } = await supabaseApi.supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles (role)
        `)
        .order('full_name', { ascending: true });

      if (error) throw error;

      const usersList = (profiles || []).map((profile: { id: string; full_name: string; email: string; user_roles?: Array<{ role?: string }> }) => ({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.user_roles?.[0]?.role || 'Няма роля',
      }));

      setUsers(usersList);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Грешка при зареждане на потребители');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast.error('Моля попълнете всички полета');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Паролата трябва да е поне 6 символа');
      return;
    }

    setLoading(true);
    try {
      // Create account using signUp
      const { data: authData, error: signUpError } = await supabaseApi.supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Неуспешно създаване на потребителски акаунт.');

      const newUserId = authData.user.id;

      // Wait a bit for the profile trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify profile was created
      const { data: profile, error: profileError } = await supabaseApi.supabase
        .from('profiles')
        .select('id')
        .eq('id', newUserId)
        .single();

      if (profileError || !profile) {
        // If profile wasn't created by trigger, create it manually
        const { error: createProfileError } = await supabaseApi.supabase
          .from('profiles')
          .insert({
            id: newUserId,
            full_name: newUser.fullName,
            email: newUser.email,
          });

        if (createProfileError) {
          throw new Error(`Грешка при създаване на профил: ${createProfileError.message}`);
        }
      }

      // Assign role
      const { error: roleError } = await supabaseApi.supabase
        .from('user_roles')
        .insert({
          user_id: newUserId,
          role: newUser.role as 'admin' | 'realtor' | 'trainee' | 'team_leader' | 'office_manager' | 'regional_manager',
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // If creating a trainee or realtor, create a realtor record for training progress tracking
      if (newUser.role === 'trainee' || newUser.role === 'realtor') {
        const { error: realtorError } = await supabaseApi.supabase
          .from('realtors')
          .insert({
            user_id: newUserId,
            team_id: null,
            level: newUser.role === 'trainee' ? 1 : 3, // Trainees start at level 1, realtors at level 3
          });

        // Ignore duplicate errors (realtor might already exist)
        if (realtorError && !realtorError.message.includes('duplicate') && !realtorError.message.includes('unique')) {
          console.warn('Warning: Could not create realtor record:', realtorError);
          // Don't throw - role assignment succeeded, realtor record is optional
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
      setNewUser({ fullName: '', email: '', password: '', role: 'trainee' }); // Default to trainee for new recruits
      fetchUsers();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при създаване на потребител');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      // Delete user profile and roles (auth user will be deleted via cascade)
      const { error: profileError } = await supabaseApi.supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
      
      if (profileError) throw profileError;

      toast.success('Потребителят е изтрит успешно');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при изтриване на потребител');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async () => {
    if (!selectedUser || !promoteToRole) return;

    setLoading(true);
    try {
      // Update user role
      const { error: roleError } = await supabaseApi.supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: promoteToRole as 'admin' | 'realtor' | 'trainee' | 'team_leader' | 'office_manager' | 'regional_manager',
        }, {
          onConflict: 'user_id'
        });
      
      if (roleError) throw roleError;

      // If promoting to realtor or trainee, update realtor level
      if (promoteToRole === 'realtor' || promoteToRole === 'trainee') {
        // Check if realtor record exists
        const { data: existingRealtor } = await supabaseApi.supabase
          .from('realtors')
          .select('id, level')
          .eq('user_id', selectedUser.id)
          .maybeSingle();

        if (existingRealtor) {
          // Update level based on new role
          const newLevel = promoteToRole === 'trainee' ? 1 : 3;
          const { error: realtorError } = await supabaseApi.supabase
            .from('realtors')
            .update({ level: newLevel })
            .eq('id', existingRealtor.id);
          
          if (realtorError) throw realtorError;
        } else {
          // Create realtor record if it doesn't exist
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
      fetchUsers();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при повишаване на потребител');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Управление на акаунти</span>
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Нов акаунт</span>
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Търси по име или имейл..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users List */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Зареждане...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Няма намерени потребители
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{formatNameWithEmoji(user.fullName)}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Роля: {user.role === 'admin' ? 'Администратор' : 
                                 user.role === 'regional_manager' ? 'Регионален мениджър' :
                                 user.role === 'office_manager' ? 'Офис мениджър' :
                                 user.role === 'team_leader' ? 'Лидер на екип' :
                                 user.role === 'realtor' ? 'Реализатор' : 
                                 user.role === 'trainee' ? 'Курсист' : 'Няма роля'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setPromoteToRole('');
                            setShowPromoteDialog(true);
                          }}
                          className="text-primary hover:text-primary"
                          title="Повиши акаунт"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Създай нов акаунт</DialogTitle>
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
                  <SelectItem value="team_leader">Лидер на екип</SelectItem>
                  <SelectItem value="office_manager">Офис мениджър</SelectItem>
                  <SelectItem value="regional_manager">Регионален мениджър</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                За новобранци изберете "Курсист (Новобранец)"
              </p>
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
            <Button onClick={handleCreateUser} disabled={loading} className="flex-1">
              {loading ? 'Създаване...' : 'Създай'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote User Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Повиши акаунт</DialogTitle>
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
                  <SelectItem value="trainee">Курсист</SelectItem>
                  <SelectItem value="realtor">Реализатор</SelectItem>
                  <SelectItem value="team_leader">Ръководител на екип</SelectItem>
                  <SelectItem value="office_manager">Мениджър на офис</SelectItem>
                  <SelectItem value="regional_manager">Регионален мениджър</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
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
              disabled={loading || !promoteToRole}
              className="flex-1"
            >
              {loading ? 'Повишаване...' : 'Повиши'}
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
    </>
  );
};

