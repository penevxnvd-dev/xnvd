import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabaseApi } from '@/lib/supabaseApi';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Search } from 'lucide-react';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'realtor',
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

      const usersList = (profiles || []).map((profile: any) => ({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.user_roles?.[0]?.role || 'Няма роля',
      }));

      setUsers(usersList);
    } catch (error: any) {
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
          role: newUser.role as 'admin' | 'realtor',
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      toast.success('Потребителят е създаден успешно');
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', password: '', role: 'realtor' });
      fetchUsers();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Грешка при създаване на потребител');
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
    } catch (error: any) {
      toast.error(error.message || 'Грешка при изтриване на потребител');
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
            <DialogDescription>
              Прегледайте и управлявайте всички потребителски акаунти в системата.
            </DialogDescription>
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
                          Роля: {user.role === 'admin' ? 'Администратор' : user.role === 'realtor' ? 'Реализатор' : 'Няма роля'}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
            <DialogDescription>
              Създайте нов потребителски акаунт с име, имейл, парола и роля.
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
                  <SelectItem value="realtor">Реализатор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
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
            <Button onClick={handleCreateUser} disabled={loading} className="flex-1">
              {loading ? 'Създаване...' : 'Създай'}
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

