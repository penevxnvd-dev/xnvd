import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseApi } from '@/lib/supabaseApi';
import { toast } from 'sonner';

interface CreateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'country' | 'city' | 'office' | 'team';
  editData?: {
    id: string;
    name: string;
    code?: string;
    country_id?: string;
    city_id?: string;
    office_id?: string;
    address?: string;
  } | null;
  parentOptions?: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export const CreateEditDialog = ({
  open,
  onOpenChange,
  type,
  editData,
  parentOptions = [],
  onSuccess,
}: CreateEditDialogProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setCode(editData.code || '');
      setAddress(editData.address || '');
      if (editData.country_id) {
        setParentId(editData.country_id);
      } else if (editData.city_id) {
        setParentId(editData.city_id);
      } else if (editData.office_id) {
        setParentId(editData.office_id);
      }
    } else {
      setName('');
      setCode('');
      setParentId(parentOptions.length === 1 ? parentOptions[0].id : '');
      setAddress('');
    }
  }, [editData, open, parentOptions]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Моля въведете име');
      return;
    }

    if (type === 'country' && !code.trim()) {
      toast.error('Моля въведете код');
      return;
    }

    if (type !== 'country' && !parentId) {
      toast.error('Моля изберете родителски елемент');
      return;
    }

    setLoading(true);
    try {
      if (editData) {
        // Редактиране
        if (type === 'country') {
          await supabaseApi.updateCountry(editData.id, { name, code });
        } else if (type === 'city') {
          await supabaseApi.updateCity(editData.id, { name });
        } else if (type === 'office') {
          await supabaseApi.updateOffice(editData.id, { name, address });
        } else if (type === 'team') {
          await supabaseApi.updateTeam(editData.id, { name });
        }
        toast.success('Успешно обновено');
      } else {
        // Създаване
        if (type === 'country') {
          await supabaseApi.createCountry({ name, code });
        } else if (type === 'city') {
          await supabaseApi.createCity({ name, countryId: parentId });
        } else if (type === 'office') {
          await supabaseApi.createOffice({ name, cityId: parentId, address });
        } else if (type === 'team') {
          await supabaseApi.createTeam({ name, officeId: parentId });
        }
        toast.success('Успешно създадено');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Грешка при запазване');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const action = editData ? 'Редактиране' : 'Създаване';
    const typeName =
      type === 'country'
        ? 'Държава'
        : type === 'city'
        ? 'Град'
        : type === 'office'
        ? 'Офис'
        : 'Екип';
    return `${action} на ${typeName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {editData ? 'Редактирайте информацията за ' : 'Създайте нов '}
            {type === 'country' ? 'държава' : type === 'city' ? 'град' : type === 'office' ? 'офис' : 'екип'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Име *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Въведете име"
            />
          </div>

          {type === 'country' && (
            <div className="space-y-2">
              <Label htmlFor="code">Код *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BG"
                maxLength={2}
              />
            </div>
          )}

          {type === 'office' && (
            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Въведете адрес"
              />
            </div>
          )}

          {type !== 'country' && parentOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parent">
                {type === 'city'
                  ? 'Държава'
                  : type === 'office'
                  ? 'Град'
                  : 'Офис'}{' '}
                *
              </Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Изберете..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отказ
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Запазване...' : editData ? 'Обнови' : 'Създай'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

