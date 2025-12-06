import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: {
    fullName: string;
    email: string;
  };
  onUpdate: () => void;
  onLogout?: () => void;
}

export const AccountSettingsDialog = ({
  open,
  onOpenChange,
  userInfo,
  onUpdate,
  onLogout,
}: AccountSettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userInfo.fullName,
    email: userInfo.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        fullName: userInfo.fullName,
        email: userInfo.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [open, userInfo]);

  const handleUpdateProfile = async () => {
    if (!formData.fullName.trim()) {
      toast.error('Името е задължително');
      return;
    }

    setLoading(true);
    try {
      // Update profile via API
      await api.updateProfile(formData.fullName);
      toast.success('Профилът е обновен успешно');
      onUpdate();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при обновяване на профила');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword) {
      toast.error('Моля попълнете всички полета за парола');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Новите пароли не съвпадат');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Паролата трябва да е поне 6 символа');
      return;
    }

    setLoading(true);
    try {
      // Update password using Supabase Auth
      await api.updatePassword(formData.currentPassword, formData.newPassword);

      toast.success('Паролата е променена успешно');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при промяна на паролата');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки на акаунта</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Profile Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Информация за профила</h3>
            <div className="space-y-2">
              <Label htmlFor="fullName">Име и фамилия</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Имейлът не може да се променя
              </p>
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
              {loading ? 'Запазване...' : 'Запази промените'}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Промяна на парола</h3>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текуща парола</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Въведете текущата парола"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Нова парола</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Минимум 6 символа"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Потвърди нова парола</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Потвърди новата парола"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Промяна...' : 'Промени парола'}
            </Button>
          </div>

          {/* Logout Section */}
          {onLogout && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 text-destructive">Изход</h3>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onLogout();
                }}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Изход от акаунта
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Затвори
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

