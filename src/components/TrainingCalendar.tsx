import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Calendar as CalendarIcon, Users, Award, BookOpen, UserPlus, Clock, Edit, Trash2, Plus, ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, Search, Filter, Download, Printer, Copy, Grid3x3, List, Calendar, BarChart3, Bell, X, MoreVertical, LayoutGrid, LayoutList, GripVertical } from 'lucide-react';
import { TrainingGroup } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useRef, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, addDays, nextMonday, nextDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, parse, differenceInDays, isPast, isFuture } from 'date-fns';
import { bg } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TrainingCalendarProps {
  groups: TrainingGroup[];
  onGroupClick: (group: TrainingGroup) => void;
  onUpdateGroups?: (groups: TrainingGroup[]) => void;
}

const getTrainingDayLabel = (day: number) => {
  switch (day) {
    case 1:
      return 'Ден 1: Въвъдително обучение';
    case 2:
      return 'Ден 2: Разговор с купувач';
    case 3:
      return 'Ден 3: Разговор с продавач и изпит';
    default:
      return 'Неизвестен ден';
  }
};

export const TrainingCalendar = ({ groups, onGroupClick, onUpdateGroups }: TrainingCalendarProps) => {
  const activeGroups = groups.filter(g => g.status === 'активна');
  const completedGroups = groups.filter(g => g.status === 'завършена');
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [contextMenuDate, setContextMenuDate] = useState<Date | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTrainee, setDraggedTrainee] = useState<{ trainee: any; groupId: string } | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [newTrainee, setNewTrainee] = useState({
    name: '',
    phone: '',
    position: '',
    selectedDate: ''
  });

  const [registeredTrainees, setRegisteredTrainees] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    position: string;
    selectedDate: string;
  }>>([]);

  const [editingTrainee, setEditingTrainee] = useState<{
    id: string;
    name: string;
    phone: string;
    position: string;
    selectedDate?: string;
    groupId?: string;
  } | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [addToGroupId, setAddToGroupId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newGroupTrainee, setNewGroupTrainee] = useState({
    name: '',
    phone: '',
    position: ''
  });

  // Изчисляване на следващия понеделник и четвъртък
  const getNextMonday = () => {
    const today = new Date();
    const next = nextMonday(today);
    return format(next, 'dd.MM.yyyy');
  };

  const getNextThursday = () => {
    const today = new Date();
    let next = nextDay(today, 4); // 4 = Thursday
    // Ако четвъртък е преди понеделник (т.е. тази седмица), вземи следващия
    if (next < nextMonday(today)) {
      next = addDays(next, 7);
    }
    return format(next, 'dd.MM.yyyy');
  };

  const upcomingGroups = [
    {
      id: 'upcoming-monday',
      date: getNextMonday(),
      day: 'Понеделник',
      trainees: registeredTrainees.filter(t => t.selectedDate === 'monday')
    },
    {
      id: 'upcoming-thursday',
      date: getNextThursday(),
      day: 'Четвъртък',
      trainees: registeredTrainees.filter(t => t.selectedDate === 'thursday')
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrainee.name && newTrainee.phone && newTrainee.position && newTrainee.selectedDate) {
      const newEntry = {
        id: `trainee-${Date.now()}`,
        ...newTrainee
      };
      setRegisteredTrainees([...registeredTrainees, newEntry]);
      const dateLabel = newTrainee.selectedDate === 'monday' ? 'понеделник' : 'четвъртък';
      toast({
        title: "Курсист записан успешно!",
        description: `${newTrainee.name} е добавен/а към групата за ${dateLabel}.`,
      });
      setNewTrainee({ name: '', phone: '', position: '', selectedDate: '' });
    }
  };

  const handleEditTrainee = (trainee: any, groupId?: string) => {
    setEditingTrainee({
      id: trainee.id,
      name: trainee.name,
      phone: trainee.phone,
      position: trainee.position,
      selectedDate: trainee.selectedDate,
      groupId
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTrainee) return;

    if (editingTrainee.groupId) {
      // Редактиране на курсист от активна група
      const updatedGroups = groups.map(group => {
        if (group.id === editingTrainee.groupId) {
          return {
            ...group,
            trainees: group.trainees.map(t => 
              t.id === editingTrainee.id 
                ? { ...t, name: editingTrainee.name, phone: editingTrainee.phone, position: editingTrainee.position }
                : t
            )
          };
        }
        return group;
      });
      onUpdateGroups?.(updatedGroups);
    } else {
      // Редактиране на курсист от предстоящи групи
      setRegisteredTrainees(prev => 
        prev.map(t => 
          t.id === editingTrainee.id 
            ? { ...t, name: editingTrainee.name, phone: editingTrainee.phone, position: editingTrainee.position, selectedDate: editingTrainee.selectedDate || t.selectedDate }
            : t
        )
      );
    }

    toast({
      title: "Информацията е актуализирана!",
      description: `Данните за ${editingTrainee.name} са запазени.`,
    });
    setIsEditDialogOpen(false);
    setEditingTrainee(null);
  };

  const handleDeleteTrainee = (traineeId: string, groupId?: string) => {
    if (groupId) {
      // Изтриване от активна група
      const updatedGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            trainees: group.trainees.filter(t => t.id !== traineeId)
          };
        }
        return group;
      });
      onUpdateGroups?.(updatedGroups);
    } else {
      // Изтриване от предстоящи групи
      setRegisteredTrainees(prev => prev.filter(t => t.id !== traineeId));
    }

    toast({
      title: "Курсистът е премахнат",
      description: "Курсистът беше успешно изтрит.",
    });
  };

  const handleAddToGroup = (groupId: string) => {
    setAddToGroupId(groupId);
    setIsAddDialogOpen(true);
  };

  const handleSaveNewGroupTrainee = () => {
    if (!addToGroupId || !newGroupTrainee.name || !newGroupTrainee.phone || !newGroupTrainee.position) return;

    const updatedGroups = groups.map(group => {
      if (group.id === addToGroupId) {
        return {
          ...group,
          trainees: [...group.trainees, {
            id: `trainee-${Date.now()}`,
            name: newGroupTrainee.name,
            phone: newGroupTrainee.phone,
            position: newGroupTrainee.position,
            level: 'Чирак' as const,
            trainingStage: 1 as const,
            dateOfHiring: new Date().toISOString().split('T')[0],
            email: '',
            department: '',
            skills: [],
            deals: [],
            levelHistory: []
          }]
        };
      }
      return group;
    });
    
    onUpdateGroups?.(updatedGroups);
    toast({
      title: "Курсист добавен!",
      description: `${newGroupTrainee.name} е добавен/а към групата.`,
    });
    setIsAddDialogOpen(false);
    setNewGroupTrainee({ name: '', phone: '', position: '' });
    setAddToGroupId(null);
  };

  const handleCopyGroup = (group: TrainingGroup) => {
    const newGroup: TrainingGroup = {
      ...group,
      id: `group-${Date.now()}`,
      startDate: format(addDays(parse(group.startDate, 'yyyy-MM-dd', new Date()), 7), 'yyyy-MM-dd'),
      status: 'предстояща' as any,
      currentDay: 0,
      trainees: group.trainees.map(t => ({
        ...t,
        id: `trainee-${Date.now()}-${Math.random()}`
      }))
    };
    
    onUpdateGroups?.([...groups, newGroup]);
    toast({
      title: "Група копирана!",
      description: `Групата е копирана за ${newGroup.startDate}.`,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the trainee being dragged
    const traineeId = active.id as string;
    const group = groups.find(g => g.trainees.some(t => t.id === traineeId));
    if (group) {
      const trainee = group.trainees.find(t => t.id === traineeId);
      if (trainee) {
        setDraggedTrainee({ trainee, groupId: group.id });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedTrainee(null);

    if (!over || !draggedTrainee) return;

    const traineeId = active.id as string;
    const targetGroupId = over.id as string;

    // Don't move if dropped on the same group
    if (targetGroupId === draggedTrainee.groupId) return;

    // Find source and target groups
    const sourceGroup = groups.find(g => g.id === draggedTrainee.groupId);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sourceGroup || !targetGroup) {
      // Maybe dropped on a date - create new group or add to existing
      return;
    }

    // Remove from source group
    const updatedSourceGroup = {
      ...sourceGroup,
      trainees: sourceGroup.trainees.filter(t => t.id !== traineeId)
    };

    // Add to target group
    const updatedTargetGroup = {
      ...targetGroup,
      trainees: [...targetGroup.trainees, draggedTrainee.trainee]
    };

    // Update groups
    const updatedGroups = groups.map(g => {
      if (g.id === sourceGroup.id) return updatedSourceGroup;
      if (g.id === targetGroup.id) return updatedTargetGroup;
      return g;
    });

    onUpdateGroups?.(updatedGroups);
    toast({
      title: "Курсист преместен!",
      description: `${draggedTrainee.trainee.name} е преместен/а от ${sourceGroup.leader} към ${targetGroup.leader}.`,
    });
  };

  // Sortable Trainee Item Component
  const SortableTraineeItem = ({ trainee, groupId, onEdit, onDelete }: { 
    trainee: any; 
    groupId?: string;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: trainee.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between text-sm gap-2 p-2 rounded-md hover:bg-accent/50"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{trainee.name}</p>
            <p className="text-xs text-muted-foreground truncate">{trainee.position}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onEdit}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактиране на курсист</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Име и фамилия</Label>
              <Input
                id="edit-name"
                value={editingTrainee?.name || ''}
                onChange={(e) => setEditingTrainee(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Телефон</Label>
              <Input
                id="edit-phone"
                value={editingTrainee?.phone || ''}
                onChange={(e) => setEditingTrainee(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Позиция</Label>
              <Input
                id="edit-position"
                value={editingTrainee?.position || ''}
                onChange={(e) => setEditingTrainee(prev => prev ? { ...prev, position: e.target.value } : null)}
              />
            </div>
            {editingTrainee?.selectedDate && (
              <div className="space-y-2">
                <Label htmlFor="edit-date">Дата на групата</Label>
                <Select
                  value={editingTrainee.selectedDate}
                  onValueChange={(value) => setEditingTrainee(prev => prev ? { ...prev, selectedDate: value } : null)}
                >
                  <SelectTrigger id="edit-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Понеделник ({getNextMonday()})</SelectItem>
                    <SelectItem value="thursday">Четвъртък ({getNextThursday()})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSaveEdit} className="w-full">
              Запази промените
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавяне на курсист към група</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Име и фамилия</Label>
              <Input
                id="new-name"
                value={newGroupTrainee.name}
                onChange={(e) => setNewGroupTrainee(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Телефон</Label>
              <Input
                id="new-phone"
                value={newGroupTrainee.phone}
                onChange={(e) => setNewGroupTrainee(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-position">Позиция</Label>
              <Input
                id="new-position"
                value={newGroupTrainee.position}
                onChange={(e) => setNewGroupTrainee(prev => ({ ...prev, position: e.target.value }))}
              />
            </div>
            <Button onClick={handleSaveNewGroupTrainee} className="w-full">
              Добави курсист
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Календар на обученията</h2>
        </div>
        
        {/* Toolbar with filters, search, and view options */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Търсене
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput 
                  placeholder="Търсене по име, телефон..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>Няма резултати.</CommandEmpty>
                  <CommandGroup heading="Курсисти">
                    {[...activeGroups, ...completedGroups].flatMap(g => g.trainees)
                      .filter(t => 
                        searchQuery && (
                          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.phone.includes(searchQuery)
                        )
                      )
                      .slice(0, 5)
                      .map(t => (
                        <CommandItem key={t.id} onSelect={() => {
                          const group = [...activeGroups, ...completedGroups].find(g => g.trainees.some(tr => tr.id === t.id));
                          if (group) {
                            const date = parse(group.startDate, 'yyyy-MM-dd', new Date());
                            setCurrentMonth(date);
                            setSelectedDate(date);
                            setIsDateDialogOpen(true);
                          }
                        }}>
                          <Users className="h-4 w-4 mr-2" />
                          {t.name} - {t.phone}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Филтър
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Статус на групите</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                Всички
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                Активни
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('upcoming')}>
                Предстоящи
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
                Завършени
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {viewMode === 'month' && <LayoutGrid className="h-4 w-4 mr-2" />}
                {viewMode === 'week' && <Calendar className="h-4 w-4 mr-2" />}
                {viewMode === 'day' && <CalendarIcon className="h-4 w-4 mr-2" />}
                {viewMode === 'list' && <LayoutList className="h-4 w-4 mr-2" />}
                Изглед
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Изглед</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewMode('month')}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Месечен
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('week')}>
                <Calendar className="h-4 w-4 mr-2" />
                Седмичен
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('day')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Дневен
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('list')}>
                <LayoutList className="h-4 w-4 mr-2" />
                Списък
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Експорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Експорт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                // Export as CSV
                const csv = [
                  ['Дата', 'Инструктор', 'Статус', 'Курсисти', 'Ден'].join(','),
                  ...groups.map(g => [
                    g.startDate,
                    g.leader,
                    g.status,
                    g.trainees.length,
                    g.currentDay
                  ].join(','))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `training-calendar-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                a.click();
                toast({ title: 'Експортирано успешно!', description: 'Календарът е експортиран като CSV.' });
              }}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Печат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Активни групи</p>
              <p className="text-2xl font-bold text-green-600">{activeGroups.length}</p>
            </div>
            <PlayCircle className="h-8 w-8 text-green-500/50" />
          </div>
          <Progress value={(activeGroups.length / (groups.length || 1)) * 100} className="mt-2" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Предстоящи групи</p>
              <p className="text-2xl font-bold text-blue-600">{upcomingGroups.reduce((sum, g) => sum + g.trainees.length, 0) > 0 ? upcomingGroups.length : 0}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500/50" />
          </div>
          <Progress value={upcomingGroups.length * 10} className="mt-2" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Завършени групи</p>
              <p className="text-2xl font-bold text-gray-600">{completedGroups.length}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-gray-500/50" />
          </div>
          <Progress value={(completedGroups.length / (groups.length || 1)) * 100} className="mt-2" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Общо курсисти</p>
              <p className="text-2xl font-bold text-primary">
                {groups.reduce((sum, g) => sum + g.trainees.length, 0) + registeredTrainees.length}
              </p>
            </div>
            <Users className="h-8 w-8 text-primary/50" />
          </div>
          <Progress value={75} className="mt-2" />
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="month"><LayoutGrid className="h-4 w-4 mr-2" />Месечен</TabsTrigger>
          <TabsTrigger value="week"><Calendar className="h-4 w-4 mr-2" />Седмичен</TabsTrigger>
          <TabsTrigger value="day"><CalendarIcon className="h-4 w-4 mr-2" />Дневен</TabsTrigger>
          <TabsTrigger value="list"><LayoutList className="h-4 w-4 mr-2" />Списък</TabsTrigger>
        </TabsList>

        {/* Month View */}
        <TabsContent value="month" className="mt-4">
          <Card className="p-4 bg-background border-2 border-primary/20">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">
                  {format(currentMonth, 'MMMM yyyy', { locale: bg })}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Днес
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

        {/* Calendar Grid */}
        <div className="w-full">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1">
                {day}
              </div>
            ))}
        </div>
        
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const monthStart = startOfMonth(currentMonth);
              const monthEnd = endOfMonth(currentMonth);
              const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
              const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
              const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

              // Get all group dates
              const groupDates = new Map<string, TrainingGroup[]>();
              
              // Add active and completed groups
              [...activeGroups, ...completedGroups].forEach(group => {
                if (group.startDate) {
                  const dateKey = group.startDate;
                  if (!groupDates.has(dateKey)) {
                    groupDates.set(dateKey, []);
                  }
                  groupDates.get(dateKey)!.push(group);
                }
              });
              
              // Add upcoming groups only for Mondays and Thursdays
              upcomingGroups.forEach(g => {
                const parsedDate = parse(g.date, 'dd.MM.yyyy', new Date());
                const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday, 4 = Thursday
                
                // Only add if it's Monday (1) or Thursday (4)
                if (dayOfWeek === 1 || dayOfWeek === 4) {
                  const dateKey = parsedDate.toISOString().split('T')[0];
                  if (!groupDates.has(dateKey)) {
                    groupDates.set(dateKey, []);
                  }
                  groupDates.get(dateKey)!.push({
                    id: g.id,
                    startDate: dateKey,
                    leader: '',
                    leaderId: '',
                    currentDay: 0,
                    status: 'предстояща' as any,
                    trainees: g.trainees.map(t => ({
                      id: t.id,
                      name: t.name,
                      position: t.position,
                      level: 'Чирак' as const,
                      trainingStage: 1 as const,
                      dateOfHiring: new Date().toISOString().split('T')[0],
                      email: '',
                      phone: t.phone,
                      department: '',
                      skills: [],
                      deals: [],
                      levelHistory: []
                    }))
                  } as TrainingGroup);
                }
              });

              return days.map((day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayGroups = groupDates.get(dateKey) || [];
                const isMonday = day.getDay() === 1;
                const isThursday = day.getDay() === 4;

                const totalTrainees = dayGroups.reduce((sum, g) => sum + (g.trainees?.length || 0), 0);
                const hasNotifications = (isMonday || isThursday) && dayGroups.length === 0;
                
                return (
                  <TooltipProvider key={dayIdx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div
                              className={`
                                min-h-[80px] border border-border rounded-md p-1.5 cursor-pointer relative
                                transition-all duration-200 hover:bg-accent/50 hover:border-primary/50 hover:shadow-md
                                ${!isCurrentMonth ? 'opacity-40' : ''}
                                ${isToday ? 'bg-primary/10 border-primary' : ''}
                                ${hasNotifications ? 'ring-2 ring-blue-500/30' : ''}
                              `}
                              onClick={() => {
                                setSelectedDate(day);
                                setIsDateDialogOpen(true);
                              }}
                              onMouseEnter={() => setHoveredDate(day)}
                              onMouseLeave={() => setHoveredDate(null)}
                            >
                              {/* Quick Add Button */}
                              {(isMonday || isThursday) && isCurrentMonth && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(day);
                                    setShowQuickAdd(format(day, 'yyyy-MM-dd'));
                                    setIsDateDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {/* Notification Badge */}
                              {hasNotifications && (
                                <div className="absolute top-1 right-1">
                                  <Bell className="h-3 w-3 text-blue-500" />
                                </div>
                              )}
                              <div className={`
                                text-xs font-medium mb-0.5
                                ${isToday ? 'text-primary' : ''}
                                ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                              `}>
                                {format(day, 'd')}
                              </div>
                              <div className="space-y-0.5">
                                {dayGroups
                                  .filter(g => {
                                    if (filterStatus === 'all') return true;
                                    if (filterStatus === 'active') return g.status === 'активна';
                                    if (filterStatus === 'upcoming') return !g.status || g.status === 'предстояща';
                                    if (filterStatus === 'completed') return g.status === 'завършена';
                                    return true;
                                  })
                                  .map((group, idx) => {
                                    const isActive = group.status === 'активна';
                                    const isCompleted = group.status === 'завършена';
                                    const isUpcoming = !group.status || group.status === 'предстояща' || !('status' in group);
                                    const traineeCount = group.trainees?.length || 0;
                                    const hasContent = group.leader || traineeCount > 0;
                                    
                                    // Don't render empty badges
                                    if (!hasContent) return null;
                                    
                                    // Calculate progress for active groups
                                    const progress = isActive ? (group.currentDay / 3) * 100 : 0;
                                    
                                    return (
                                      <div
                                        key={idx}
                                        className={`
                                          text-[10px] px-1.5 py-1 rounded-md truncate flex items-center gap-1
                                          font-medium group/item relative
                                          transition-all duration-200 hover:scale-105
                                          ${isActive ? 'bg-green-500/20 dark:bg-green-500/30 text-green-700 dark:text-green-300 border border-green-500/30' : ''}
                                          ${isCompleted ? 'bg-gray-400/20 dark:bg-gray-600/30 text-gray-600 dark:text-gray-400 border border-gray-400/30' : ''}
                                          ${isUpcoming ? 'bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-500/30' : ''}
                                        `}
                                      >
                                        {isActive && <PlayCircle className="h-2.5 w-2.5 flex-shrink-0" />}
                                        {isCompleted && <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />}
                                        {isUpcoming && <Clock className="h-2.5 w-2.5 flex-shrink-0" />}
                                        <span className="truncate flex-1">
                                          {group.leader || (traineeCount > 0 ? `${traineeCount} курсисти` : '')}
                                        </span>
                                        {traineeCount > 0 && (
                                          <span className="flex-shrink-0 font-bold">
                                            {traineeCount}
                                          </span>
                                        )}
                                        {isActive && (
                                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/50 rounded-b-md">
                                            <div 
                                              className="h-full bg-green-500 rounded-b-md transition-all duration-300"
                                              style={{ width: `${progress}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => {
                              setSelectedDate(day);
                              setIsDateDialogOpen(true);
                            }}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Виж детайли
                            </ContextMenuItem>
                            {(isMonday || isThursday) && (
                              <ContextMenuItem onClick={() => {
                                setSelectedDate(day);
                                setShowQuickAdd(format(day, 'yyyy-MM-dd'));
                                setIsDateDialogOpen(true);
                              }}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Добави курсист
                              </ContextMenuItem>
                            )}
                            <ContextMenuItem onClick={() => {
                              const csv = [
                                ['Име', 'Телефон', 'Позиция'].join(','),
                                ...dayGroups.flatMap(g => g.trainees.map(t => 
                                  [t.name, t.phone, t.position].join(',')
                                ))
                              ].join('\n');
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `trainees-${format(day, 'yyyy-MM-dd')}.csv`;
                              a.click();
                            }}>
                              <Download className="h-4 w-4 mr-2" />
                              Експорт курсисти
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-semibold">{format(day, 'EEEE, d MMMM yyyy', { locale: bg })}</p>
                          {dayGroups.length > 0 ? (
                            <>
                              <p className="text-sm">Групи: {dayGroups.length}</p>
                              <p className="text-sm">Курсисти: {totalTrainees}</p>
                              {dayGroups.map((g, i) => (
                                <div key={i} className="text-xs">
                                  {g.leader && <p>{g.leader}</p>}
                                  <p className="text-muted-foreground">
                                    {g.status === 'активна' && `Ден ${g.currentDay}/3`}
                                    {g.status === 'завършена' && 'Завършена'}
                                    {(!g.status || g.status === 'предстояща') && 'Предстояща'}
                                  </p>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {(isMonday || isThursday) ? 'Нова група може да се създаде' : 'Няма групи'}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
                });
              })()}
            </div>
          </div>
          </Card>
        </TabsContent>

        {/* Week View */}
        <TabsContent value="week" className="mt-4">
          <Card className="p-4 bg-background border-2 border-primary/20">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">
                  Седмица {format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMM', { locale: bg })} - {format(endOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: bg })}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Днес</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {eachDayOfInterval({
                start: startOfWeek(currentMonth, { weekStartsOn: 1 }),
                end: endOfWeek(currentMonth, { weekStartsOn: 1 })
              }).map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayGroups = [...activeGroups, ...completedGroups].filter(g => g.startDate === dateKey);
                return (
                  <Card key={idx} className="p-3 min-h-[200px]">
                    <div className="font-semibold mb-2">{format(day, 'EEEE d', { locale: bg })}</div>
                    <div className="space-y-2">
                      {dayGroups.map(g => (
                        <div key={g.id} className="text-xs p-2 bg-accent rounded">
                          {g.leader} - {g.trainees.length} курсисти
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Day View */}
        <TabsContent value="day" className="mt-4">
          <Card className="p-4 bg-background border-2 border-primary/20">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">
                  {format(selectedDate || currentMonth, 'EEEE, d MMMM yyyy', { locale: bg })}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate || currentMonth, -1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Днес</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate || currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {(() => {
                const dateKey = format(selectedDate || currentMonth, 'yyyy-MM-dd');
                const dayGroups = [...activeGroups, ...completedGroups].filter(g => g.startDate === dateKey);
                return dayGroups.length > 0 ? (
                  dayGroups.map(g => (
                    <Card key={g.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{g.leader}</h4>
                        <Badge>{g.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{g.trainees.length} курсисти</p>
                      <div className="space-y-1">
                        {g.trainees.map(t => (
                          <div key={t.id} className="text-sm">{t.name} - {t.position}</div>
                        ))}
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Няма групи за този ден</p>
                  </Card>
                );
              })()}
            </div>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          <Card className="p-4 bg-background border-2 border-primary/20">
            <div className="space-y-3">
              {[...activeGroups, ...completedGroups]
                .filter(g => {
                  if (filterStatus === 'all') return true;
                  if (filterStatus === 'active') return g.status === 'активна';
                  if (filterStatus === 'completed') return g.status === 'завършена';
                  return true;
                })
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map(group => (
                  <Card key={group.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${group.leader}`} />
                            <AvatarFallback>{group.leader[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{group.leader}</p>
                            <p className="text-sm text-muted-foreground">{format(parse(group.startDate, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant={group.status === 'активна' ? 'default' : 'secondary'}>
                            {group.status}
                          </Badge>
                          <span>{group.trainees.length} курсисти</span>
                          {group.status === 'активна' && (
                            <span>Ден {group.currentDay}/3</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopyGroup(group)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onGroupClick(group)}>
                          Преглед
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for showing groups on selected date */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Групи за {selectedDate && format(selectedDate, 'dd.MM.yyyy')}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && (() => {
            const dateKey = format(selectedDate, 'yyyy-MM-dd');
            const dayGroups = (() => {
              const allGroups: TrainingGroup[] = [];
              
              // Add active groups
              activeGroups.forEach(group => {
                if (group.startDate === dateKey) {
                  allGroups.push(group);
                }
              });
              
              // Add completed groups
              completedGroups.forEach(group => {
                if (group.startDate === dateKey) {
                  allGroups.push(group);
                }
              });
              
              // Add upcoming groups
              upcomingGroups.forEach(group => {
                const groupDate = parse(group.date, 'dd.MM.yyyy', new Date());
                if (format(groupDate, 'yyyy-MM-dd') === dateKey) {
                  allGroups.push({
                    id: group.id,
                    startDate: dateKey,
                    leader: '',
                    leaderId: '',
                    currentDay: 0,
                    status: 'предстояща' as any,
                    trainees: group.trainees.map(t => ({
                      id: t.id,
                      name: t.name,
                      position: t.position,
                      level: 'Чирак' as const,
                      trainingStage: 1 as const,
                      dateOfHiring: new Date().toISOString().split('T')[0],
                      email: '',
                      phone: t.phone,
                      department: '',
                      skills: [],
                      deals: [],
                      levelHistory: []
                    }))
                  });
                }
              });
              
              return allGroups;
            })();
            
            const upcomingForDate = dayGroups.filter(g => !g.status || g.status === 'предстояща' || !('status' in g));
            const activeForDate = dayGroups.filter(g => g.status === 'активна');
            const completedForDate = dayGroups.filter(g => g.status === 'завършена');
            const isMonday = selectedDate.getDay() === 1;
            const isThursday = selectedDate.getDay() === 4;
            
            return (
              <div className="space-y-6">
                {/* Записване на нов курсист за този ден */}
                {(isMonday || isThursday) && (
                  <Card className="p-4 bg-accent/5 border-2 border-dashed border-primary/30">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Записване на нов курсист
                    </h4>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (newTrainee.name && newTrainee.phone && newTrainee.position && selectedDate) {
                        const dateStr = format(selectedDate, 'dd.MM.yyyy');
                        const selectedDay = isMonday ? 'monday' : 'thursday';
                        const newEntry = {
                          id: `trainee-${Date.now()}`,
                          name: newTrainee.name,
                          phone: newTrainee.phone,
                          position: newTrainee.position,
                          selectedDate: selectedDay
                        };
                        setRegisteredTrainees([...registeredTrainees, newEntry]);
                        toast({
                          title: "Курсист записан успешно!",
                          description: `${newTrainee.name} е добавен/а към групата за ${dateStr}.`,
                        });
                        setNewTrainee({ name: '', phone: '', position: '', selectedDate: '' });
                      }
                    }} className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-name">Име и фамилия</Label>
                          <Input
                            id="dialog-name"
                            value={newTrainee.name}
                            onChange={(e) => setNewTrainee({ ...newTrainee, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dialog-phone">Телефон</Label>
                          <Input
                            id="dialog-phone"
                            value={newTrainee.phone}
                            onChange={(e) => setNewTrainee({ ...newTrainee, phone: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dialog-position">Позиция</Label>
                          <Input
                            id="dialog-position"
                            value={newTrainee.position}
                            onChange={(e) => setNewTrainee({ ...newTrainee, position: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Запиши курсист
                      </Button>
                    </form>
                  </Card>
                )}
                
                {/* Предстоящи групи */}
                {upcomingForDate.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Предстоящи групи ({upcomingForDate.length})
                    </h4>
                    <div className="space-y-3">
                      {upcomingForDate.map((group) => {
                        const upcomingGroup = upcomingGroups.find(g => {
                          const groupDate = parse(g.date, 'dd.MM.yyyy', new Date());
                          return format(groupDate, 'yyyy-MM-dd') === dateKey;
                        });
                        return (
                          <Card key={group.id} className="p-4 bg-accent/5 border-2 border-dashed border-primary/30">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="bg-primary/10">
                                  {upcomingGroup?.day || 'Нова група'}
                                </Badge>
                                <span className="text-sm font-medium text-muted-foreground">
                                  📅 {upcomingGroup?.date || format(selectedDate, 'dd.MM.yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {group.trainees.length} записани курсисти
                                </span>
                              </div>
                              {group.trainees.length > 0 && (
                                <div className="pt-2 border-t border-border">
                                  <SortableContext items={group.trainees.map(t => t.id)} id={group.id}>
                                    <div className="space-y-2">
                                      {group.trainees.map((trainee) => (
                                        <SortableTraineeItem
                                          key={trainee.id}
                                          trainee={trainee}
                                          onEdit={() => handleEditTrainee(trainee)}
                                          onDelete={() => handleDeleteTrainee(trainee.id)}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </div>
                              )}
                              {group.trainees.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  Все още няма записани курсисти
                                </p>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Активни групи */}
                {activeForDate.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Активни групи ({activeForDate.length})
                    </h4>
                    <div className="space-y-3">
                      {activeForDate.map((group) => (
                        <DroppableGroup key={group.id} group={group}>
                          <Card className="p-4 hover:shadow-lg transition-shadow">
                            <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onGroupClick(group);
                                  setIsDateDialogOpen(false);
                                }}
                                className="flex-1 justify-start"
                              >
                                Преглед на група
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyGroup(group)}
                                title="Копирай група"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToGroup(group.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Добави курсист
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge variant="default">Активна</Badge>
                              <Badge variant="outline">{getTrainingDayLabel(group.currentDay)}</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${group.leader}`} />
                                <AvatarFallback>{group.leader[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{group.leader}</p>
                                <p className="text-sm text-muted-foreground">Инструктор</p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              📅 Започната: {group.startDate}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {group.trainees.length} курсисти
                              </span>
                            </div>
                            <div className="pt-2 border-t border-border">
                              <SortableContext items={group.trainees.map(t => t.id)} id={group.id}>
                                <div className="space-y-2">
                                  {group.trainees.map((trainee) => (
                                    <SortableTraineeItem
                                      key={trainee.id}
                                      trainee={trainee}
                                      groupId={group.id}
                                      onEdit={() => handleEditTrainee(trainee, group.id)}
                                      onDelete={() => handleDeleteTrainee(trainee.id, group.id)}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </div>
                          </div>
                        </Card>
                        </DroppableGroup>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Завършени групи */}
                {completedForDate.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-success" />
                      Завършени групи ({completedForDate.length})
                    </h4>
                    <div className="space-y-3">
                      {completedForDate.map((group) => (
                        <Card
                          key={group.id}
                          className="p-4 cursor-pointer hover:shadow-lg transition-shadow opacity-75"
                          onClick={() => {
                            onGroupClick(group);
                            setIsDateDialogOpen(false);
                          }}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="bg-success/20 text-success">
                                Завършена
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${group.leader}`} />
                                <AvatarFallback>{group.leader[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{group.leader}</p>
                                <p className="text-sm text-muted-foreground">Инструктор</p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              📅 Започната: {group.startDate}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {group.trainees.length} завършили
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {dayGroups.length === 0 && (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Няма групи за този ден
                      {(isMonday || isThursday) && ' - Можете да запишете нов курсист'}
                    </p>
                  </Card>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedTrainee ? (
            <div className="bg-background border rounded-md p-3 shadow-lg">
              <p className="font-medium">{draggedTrainee.trainee.name}</p>
              <p className="text-xs text-muted-foreground">{draggedTrainee.trainee.position}</p>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};
