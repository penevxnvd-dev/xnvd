import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Plus, Trash2, Clock, User } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { bg } from 'date-fns/locale';

interface ScheduleEntry {
  id: string;
  scheduleDate: string;
  timeSlot: string;
  buyer1Name?: string;
  buyer1Phone?: string;
  buyer1Notes?: string;
  buyer2Name?: string;
  buyer2Phone?: string;
  buyer2Notes?: string;
}

interface WeeklyBuyerScheduleProps {
  realtorId: string;
}

export const WeeklyBuyerSchedule = ({ realtorId }: WeeklyBuyerScheduleProps) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [formData, setFormData] = useState({
    scheduleDate: '',
    timeSlot: '',
    buyer1Name: '',
    buyer1Phone: '',
    buyer1Notes: '',
    buyer2Name: '',
    buyer2Phone: '',
    buyer2Notes: '',
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await api.getMySchedule(dateStr);
      setSchedule(data || []);
    } catch (error: unknown) {
      console.error('Error fetching schedule:', error);
      toast.error('Грешка при зареждане на графика');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAddEntry = (date: Date) => {
    setEditingEntry(null);
    setFormData({
      scheduleDate: format(date, 'yyyy-MM-dd'),
      timeSlot: '09:00',
      buyer1Name: '',
      buyer1Phone: '',
      buyer1Notes: '',
      buyer2Name: '',
      buyer2Phone: '',
      buyer2Notes: '',
    });
    setDialogOpen(true);
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setFormData({
      scheduleDate: entry.scheduleDate,
      timeSlot: entry.timeSlot,
      buyer1Name: entry.buyer1Name || '',
      buyer1Phone: entry.buyer1Phone || '',
      buyer1Notes: entry.buyer1Notes || '',
      buyer2Name: entry.buyer2Name || '',
      buyer2Phone: entry.buyer2Phone || '',
      buyer2Notes: entry.buyer2Notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingEntry) {
        await api.createScheduleEntry({
          ...formData,
          id: editingEntry.id,
        });
        toast.success('Графикът е обновен');
      } else {
        await api.createScheduleEntry(formData);
        toast.success('Графикът е добавен');
      }
      setDialogOpen(false);
      fetchSchedule();
    } catch (error: unknown) {
      console.error('Error saving schedule:', error);
      toast.error('Грешка при запазване на графика');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете този запис?')) {
      return;
    }
    try {
      await api.deleteScheduleEntry(id);
      toast.success('Записът е изтрит');
      fetchSchedule();
    } catch (error: unknown) {
      console.error('Error deleting schedule:', error);
      toast.error('Грешка при изтриване на записа');
    }
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.filter((entry) => entry.scheduleDate === dateStr);
  };

  const formatTime = (timeSlot: string) => {
    return timeSlot.substring(0, 5); // HH:mm
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Зареждане...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <span>График за седмицата</span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              ← Предишна
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Днес
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              Следваща →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4 text-center">
            {format(weekStart, 'd MMM', { locale: bg })} -{' '}
            {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: bg })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayEntries = getEntriesForDate(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-lg p-2 min-h-[200px] ${
                    isToday ? 'bg-primary/5 border-primary' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {format(day, 'EEE', { locale: bg })}
                      </div>
                      <div className="text-sm font-semibold">
                        {format(day, 'd MMM', { locale: bg })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddEntry(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-background border rounded p-1.5 text-xs cursor-pointer hover:bg-accent"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{formatTime(entry.timeSlot)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        {entry.buyer1Name && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{entry.buyer1Name}</span>
                          </div>
                        )}
                        {entry.buyer2Name && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{entry.buyer2Name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Редактиране на график' : 'Добавяне на график'}
            </DialogTitle>
            <DialogDescription>
              Добавете информация за двама купувачи за този час
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={formData.scheduleDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduleDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Час</Label>
                <Input
                  type="time"
                  value={formData.timeSlot}
                  onChange={(e) =>
                    setFormData({ ...formData, timeSlot: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Купувач 1</h3>
              <div className="space-y-2">
                <div>
                  <Label>Име</Label>
                  <Input
                    value={formData.buyer1Name}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer1Name: e.target.value })
                    }
                    placeholder="Име на купувач"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={formData.buyer1Phone}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer1Phone: e.target.value })
                    }
                    placeholder="+359..."
                  />
                </div>
                <div>
                  <Label>Бележки</Label>
                  <Textarea
                    value={formData.buyer1Notes}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer1Notes: e.target.value })
                    }
                    placeholder="Допълнителна информация..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Купувач 2</h3>
              <div className="space-y-2">
                <div>
                  <Label>Име</Label>
                  <Input
                    value={formData.buyer2Name}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer2Name: e.target.value })
                    }
                    placeholder="Име на купувач"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={formData.buyer2Phone}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer2Phone: e.target.value })
                    }
                    placeholder="+359..."
                  />
                </div>
                <div>
                  <Label>Бележки</Label>
                  <Textarea
                    value={formData.buyer2Notes}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer2Notes: e.target.value })
                    }
                    placeholder="Допълнителна информация..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отказ
            </Button>
            <Button onClick={handleSave}>Запази</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

