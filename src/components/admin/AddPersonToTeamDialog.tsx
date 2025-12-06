import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabaseApi } from '@/lib/supabaseApi';
import { toast } from 'sonner';
import { formatNameWithEmoji } from '@/utils/nameEmojis';

interface AddPersonToTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onSuccess: () => void;
}

interface AvailableProfile {
  id: string;
  fullName: string;
  email: string;
  isRealtor: boolean;
  realtorId: string | null;
}

type AgentLevel = 'Чирак' | 'Реализатор' | 'Елит';

export const AddPersonToTeamDialog = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  onSuccess,
}: AddPersonToTeamDialogProps) => {
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [level, setLevel] = useState<AgentLevel>('Чирак');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [createNewAccount, setCreateNewAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (open) {
      fetchAvailableProfiles();
    }
  }, [open]);

  const fetchAvailableProfiles = async () => {
    setFetching(true);
    try {
      const profiles = await supabaseApi.getAvailableProfilesForTeam();
      setAvailableProfiles(profiles);
    } catch (error: unknown) {
      toast.error('Грешка при зареждане на профили');
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (createNewAccount) {
      // Validate new account data
      if (!newAccountData.fullName || !newAccountData.email || !newAccountData.password) {
        toast.error('Моля попълнете всички задължителни полета');
        return;
      }
      if (newAccountData.password !== newAccountData.confirmPassword) {
        toast.error('Паролите не съвпадат');
        return;
      }
      if (newAccountData.password.length < 6) {
        toast.error('Паролата трябва да е поне 6 символа');
        return;
      }
    } else {
      if (!selectedUserId) {
        toast.error('Моля изберете човек');
        return;
      }
    }

    setLoading(true);
    try {
      let userId = selectedUserId;
      
      // Create new account if needed
      if (createNewAccount) {
        const levelMap: Record<AgentLevel, number> = {
          'Чирак': 1,
          'Реализатор': 3,
          'Елит': 5
        };
        
        userId = await supabaseApi.createAccountAndAddToTeam(
          newAccountData.fullName,
          newAccountData.email,
          newAccountData.password,
          teamId,
          levelMap[level]
        );
        toast.success('Акаунт създаден и човекът е добавен в екипа');
      } else {
        const levelMap: Record<AgentLevel, number> = {
          'Чирак': 1,
          'Реализатор': 3,
          'Елит': 5
        };
        await supabaseApi.addPersonToTeam(selectedUserId, teamId, levelMap[level]);
        toast.success('Човекът е добавен успешно в екипа');
      }
      
      onSuccess();
      onOpenChange(false);
      setSelectedUserId('');
      setLevel('Чирак');
      setCreateNewAccount(false);
      setNewAccountData({ fullName: '', email: '', password: '', confirmPassword: '' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при добавяне на човек');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добави човек в екип "{teamName}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="create-account"
                checked={createNewAccount}
                onChange={(e) => {
                  setCreateNewAccount(e.target.checked);
                  if (e.target.checked) {
                    setSelectedUserId('');
                  }
                }}
                className="rounded"
              />
              <Label htmlFor="create-account" className="cursor-pointer">
                Създай нов акаунт
              </Label>
            </div>
          </div>

          {createNewAccount ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Име и фамилия *</Label>
                  <Input
                    id="fullName"
                    value={newAccountData.fullName}
                    onChange={(e) => setNewAccountData({ ...newAccountData, fullName: e.target.value })}
                    placeholder="Иван Иванов"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Имейл *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAccountData.email}
                    onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                    placeholder="ivan@example.com"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">Парола *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAccountData.password}
                    onChange={(e) => setNewAccountData({ ...newAccountData, password: e.target.value })}
                    placeholder="Минимум 6 символа"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Потвърди парола *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newAccountData.confirmPassword}
                    onChange={(e) => setNewAccountData({ ...newAccountData, confirmPassword: e.target.value })}
                    placeholder="Потвърди парола"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="person">Избери човек *</Label>
              {fetching ? (
                <div className="text-sm text-muted-foreground">Зареждане...</div>
              ) : availableProfiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Няма налични хора за добавяне. Всички потребители вече са в екипи.
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Избери човек..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {formatNameWithEmoji(profile.fullName)} ({profile.email})
                        {profile.isRealtor && ' - Реализатор'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="level">Ниво *</Label>
            <Select value={level} onValueChange={(value) => setLevel(value as AgentLevel)}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Избери ниво..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Чирак">Чирак</SelectItem>
                <SelectItem value="Реализатор">Реализатор</SelectItem>
                <SelectItem value="Елит">Елит</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Чирак (ниво 1) • Реализатор (ниво 3) • Елит (ниво 5)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отказ
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              loading || 
              (createNewAccount ? (!newAccountData.fullName || !newAccountData.email || !newAccountData.password) : (!selectedUserId || availableProfiles.length === 0))
            }
          >
            {loading ? 'Добавяне...' : createNewAccount ? 'Създай акаунт и добави' : 'Добави'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

