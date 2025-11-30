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
import { useState, useRef, useMemo, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabaseApi } from '@/lib/supabaseApi';
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
    selectedDate: '',
    email: ''
  });
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [availableLeaders, setAvailableLeaders] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  
  // Load team leaders from database
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        console.log('Fetching team leaders from database...');
        const leaders = await supabaseApi.getAllTeamLeaders();
        console.log('Fetched leaders:', leaders);
        
        if (leaders && leaders.length > 0) {
          setAvailableLeaders(leaders);
          if (!selectedLeader) {
            setSelectedLeader(leaders[0].fullName);
          }
        } else {
          console.log('No leaders from DB, trying fallback from groups');
          // Fallback to leaders from existing groups
          const leadersFromGroups = [...new Set(groups.map(g => g.leader).filter(Boolean))];
          console.log('Leaders from groups:', leadersFromGroups);
          if (leadersFromGroups.length > 0) {
            setAvailableLeaders(leadersFromGroups.map(name => ({ id: `leader-${name}`, fullName: name, email: '' })));
            if (!selectedLeader) {
              setSelectedLeader(leadersFromGroups[0]);
            }
          } else {
            console.log('No leaders found anywhere');
            setAvailableLeaders([]);
          }
        }
      } catch (error) {
        console.error('Error fetching team leaders:', error);
        // Fallback to leaders from existing groups
        const leadersFromGroups = [...new Set(groups.map(g => g.leader).filter(Boolean))];
        if (leadersFromGroups.length > 0) {
          setAvailableLeaders(leadersFromGroups.map(name => ({ id: `leader-${name}`, fullName: name, email: '' })));
          if (!selectedLeader) {
            setSelectedLeader(leadersFromGroups[0]);
          }
        } else {
          setAvailableLeaders([]);
        }
      }
    };
    
    fetchLeaders();
  }, [groups]);

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
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<TrainingGroup | null>(null);
  const [isGroupDetailsDialogOpen, setIsGroupDetailsDialogOpen] = useState(false);
  const [selectedGroupForAddTrainee, setSelectedGroupForAddTrainee] = useState<TrainingGroup | null>(null);
  const [isAddTraineeToGroupDialogOpen, setIsAddTraineeToGroupDialogOpen] = useState(false);
  const [newTraineeForGroup, setNewTraineeForGroup] = useState({
    name: '',
    phone: '',
    position: '',
    email: ''
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // If completed, show details. Otherwise, allow adding trainee
                                          if (isCompleted) {
                                            setSelectedGroupForDetails(group);
                                            setIsGroupDetailsDialogOpen(true);
                                          } else {
                                            setSelectedGroupForAddTrainee(group);
                                            setIsAddTraineeToGroupDialogOpen(true);
                                          }
                                        }}
                                        className={`
                                          text-[10px] px-1.5 py-1 rounded-md truncate flex items-center gap-1
                                          font-medium group/item relative cursor-pointer
                                          transition-all duration-200 hover:scale-105 hover:shadow-md
                                          ${isActive ? 'bg-green-500 text-white border border-green-600 shadow-sm' : ''}
                                          ${isCompleted ? 'bg-gray-500 text-white border border-gray-600 shadow-sm' : ''}
                                          ${isUpcoming ? 'bg-blue-500 text-white border border-blue-600 shadow-sm' : ''}
                                        `}
                                        title={isCompleted ? 'Виж детайли' : 'Добави курсист в групата'}
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
                                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600/50 rounded-b-md">
                                            <div 
                                              className="h-full bg-white/80 rounded-b-md transition-all duration-300"
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
                      if (newTrainee.name && newTrainee.phone && newTrainee.position && selectedDate && selectedLeader) {
                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                        const dateKey = format(selectedDate, 'yyyy-MM-dd');
                        
                        // Check if group exists for this date
                        const existingGroup = groups.find(g => g.startDate === dateKey);
                        
                        const newTraineeData = {
                          id: `trainee-${Date.now()}`,
                          name: newTrainee.name,
                          phone: newTrainee.phone,
                          position: newTrainee.position,
                          email: newTrainee.email || '',
                          level: 'Чирак' as const,
                          trainingStage: 1 as const,
                          dateOfHiring: new Date().toISOString().split('T')[0],
                          department: '',
                          skills: [],
                          deals: [],
                          levelHistory: []
                        };
                        
                        if (existingGroup) {
                          // Add to existing group
                          const updatedGroups = groups.map(g => 
                            g.id === existingGroup.id
                              ? { ...g, trainees: [...g.trainees, newTraineeData] }
                              : g
                          );
                          onUpdateGroups?.(updatedGroups);
                          toast({
                            title: "Курсист добавен!",
                            description: `${newTrainee.name} е добавен/а към групата на ${existingGroup.leader}.`,
                          });
                        } else {
                          // Create new group
                          const newGroup: TrainingGroup = {
                            id: `group-${Date.now()}`,
                            startDate: dateKey,
                            leader: selectedLeader,
                            leaderId: `leader-${selectedLeader}`,
                            currentDay: 0,
                            status: 'предстояща' as any,
                            trainees: [newTraineeData]
                          };
                          onUpdateGroups?.([...groups, newGroup]);
                          toast({
                            title: "Група създадена!",
                            description: `Нова група с ръководител ${selectedLeader} е създадена за ${format(selectedDate, 'dd.MM.yyyy', { locale: bg })}.`,
                          });
                        }
                        
                        setNewTrainee({ name: '', phone: '', position: '', selectedDate: '', email: '' });
                        setIsDateDialogOpen(false);
                      } else {
                        toast({
                          title: "Моля попълнете всички полета",
                          description: "Име, телефон, позиция и ръководител са задължителни.",
                          variant: "destructive"
                        });
                      }
                    }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-name">Име и фамилия *</Label>
                          <Input
                            id="dialog-name"
                            value={newTrainee.name}
                            onChange={(e) => setNewTrainee({ ...newTrainee, name: e.target.value })}
                            placeholder="Иван Иванов"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dialog-phone">Телефон *</Label>
                          <Input
                            id="dialog-phone"
                            value={newTrainee.phone}
                            onChange={(e) => setNewTrainee({ ...newTrainee, phone: e.target.value })}
                            placeholder="+359 888 123 456"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-position">Позиция *</Label>
                          <Input
                            id="dialog-position"
                            value={newTrainee.position}
                            onChange={(e) => setNewTrainee({ ...newTrainee, position: e.target.value })}
                            placeholder="Реализатор"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dialog-email">Имейл</Label>
                          <Input
                            id="dialog-email"
                            type="email"
                            value={newTrainee.email}
                            onChange={(e) => setNewTrainee({ ...newTrainee, email: e.target.value })}
                            placeholder="ivan@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dialog-leader">Ръководител на групата *</Label>
                        {availableLeaders.length > 0 ? (
                          <Select value={selectedLeader} onValueChange={setSelectedLeader} required>
                            <SelectTrigger id="dialog-leader">
                              <SelectValue placeholder="Избери ръководител..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLeaders.map((leader) => (
                                <SelectItem key={leader.id} value={leader.fullName}>
                                  {leader.fullName}
                                  {leader.email && ` (${leader.email})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              id="dialog-leader"
                              value={selectedLeader}
                              onChange={(e) => setSelectedLeader(e.target.value)}
                              placeholder="Въведете име на ръководител"
                              required
                            />
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                                ⚠️ Няма налични лидери на екипи
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                Моля въведете име на ръководител ръчно или отидете в админ панела и създайте екипи с назначени лидери.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>
                          Дата: <strong>{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: bg })}</strong>
                        </span>
                      </div>
                      <Button type="submit" className="w-full" size="lg">
                        <UserPlus className="h-4 w-4 mr-2" />
                        {dayGroups.length === 0 ? 'Създай група и запиши курсист' : 'Запиши курсист в група'}
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

      {/* Add Trainee to Group Dialog */}
      <Dialog open={isAddTraineeToGroupDialogOpen} onOpenChange={setIsAddTraineeToGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Добави курсист в група
            </DialogTitle>
          </DialogHeader>
          {selectedGroupForAddTrainee && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Група: {selectedGroupForAddTrainee.leader}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Дата: {format(parse(selectedGroupForAddTrainee.startDate, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy', { locale: bg })}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Текущи курсисти: {selectedGroupForAddTrainee.trainees?.length || 0}
                </p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newTraineeForGroup.name && newTraineeForGroup.phone && newTraineeForGroup.position) {
                  const newTraineeData = {
                    id: `trainee-${Date.now()}`,
                    name: newTraineeForGroup.name,
                    phone: newTraineeForGroup.phone,
                    position: newTraineeForGroup.position,
                    email: newTraineeForGroup.email || '',
                    level: 'Чирак' as const,
                    trainingStage: 1 as const,
                    dateOfHiring: new Date().toISOString().split('T')[0],
                    department: '',
                    skills: [],
                    deals: [],
                    levelHistory: []
                  };
                  
                  const updatedGroups = groups.map(g => 
                    g.id === selectedGroupForAddTrainee.id
                      ? { ...g, trainees: [...g.trainees, newTraineeData] }
                      : g
                  );
                  
                  onUpdateGroups?.(updatedGroups);
                  toast({
                    title: "Курсист добавен!",
                    description: `${newTraineeForGroup.name} е добавен/а към групата на ${selectedGroupForAddTrainee.leader}.`,
                  });
                  
                  setNewTraineeForGroup({ name: '', phone: '', position: '', email: '' });
                  setIsAddTraineeToGroupDialogOpen(false);
                  setSelectedGroupForAddTrainee(null);
                } else {
                  toast({
                    title: "Моля попълнете всички задължителни полета",
                    variant: "destructive"
                  });
                }
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="group-trainee-name">Име и фамилия *</Label>
                    <Input
                      id="group-trainee-name"
                      value={newTraineeForGroup.name}
                      onChange={(e) => setNewTraineeForGroup({ ...newTraineeForGroup, name: e.target.value })}
                      placeholder="Иван Иванов"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-trainee-phone">Телефон *</Label>
                    <Input
                      id="group-trainee-phone"
                      value={newTraineeForGroup.phone}
                      onChange={(e) => setNewTraineeForGroup({ ...newTraineeForGroup, phone: e.target.value })}
                      placeholder="+359 888 123 456"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="group-trainee-position">Позиция *</Label>
                    <Input
                      id="group-trainee-position"
                      value={newTraineeForGroup.position}
                      onChange={(e) => setNewTraineeForGroup({ ...newTraineeForGroup, position: e.target.value })}
                      placeholder="Реализатор"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-trainee-email">Имейл</Label>
                    <Input
                      id="group-trainee-email"
                      type="email"
                      value={newTraineeForGroup.email}
                      onChange={(e) => setNewTraineeForGroup({ ...newTraineeForGroup, email: e.target.value })}
                      placeholder="ivan@example.com"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsAddTraineeToGroupDialogOpen(false);
                      setNewTraineeForGroup({ name: '', phone: '', position: '', email: '' });
                      setSelectedGroupForAddTrainee(null);
                    }}
                  >
                    Отказ
                  </Button>
                  <Button type="submit" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Добави курсист
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={isGroupDetailsDialogOpen} onOpenChange={setIsGroupDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedGroupForDetails && (
                  <>
                    {selectedGroupForDetails.status === 'активна' && (
                      <Badge className="bg-green-500 text-white">
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Активна
                      </Badge>
                    )}
                    {selectedGroupForDetails.status === 'завършена' && (
                      <Badge className="bg-gray-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Завършена
                      </Badge>
                    )}
                    {(!selectedGroupForDetails.status || selectedGroupForDetails.status === 'предстояща') && (
                      <Badge className="bg-blue-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        Предстояща
                      </Badge>
                    )}
                    <span>Група: {selectedGroupForDetails.leader}</span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedGroupForDetails && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Ръководител</Label>
                    <p className="font-semibold">{selectedGroupForDetails.leader}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Дата на започване</Label>
                    <p className="font-semibold">
                      {format(parse(selectedGroupForDetails.startDate, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy', { locale: bg })}
                    </p>
                  </div>
                  {selectedGroupForDetails.status === 'активна' && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Текущ ден</Label>
                      <p className="font-semibold">Ден {selectedGroupForDetails.currentDay} от 3</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getTrainingDayLabel(selectedGroupForDetails.currentDay)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">Брой курсисти</Label>
                    <p className="font-semibold">{selectedGroupForDetails.trainees?.length || 0}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Записани курсисти</Label>
                  {selectedGroupForDetails.trainees && selectedGroupForDetails.trainees.length > 0 ? (
                    <div className="space-y-2">
                      {selectedGroupForDetails.trainees.map((trainee, idx) => (
                        <Card key={trainee.id || idx} className="p-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={trainee.avatar} alt={trainee.name} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {trainee.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">{trainee.name}</p>
                              <p className="text-sm text-muted-foreground">{trainee.position}</p>
                              {trainee.phone && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  📞 {trainee.phone}
                                </p>
                              )}
                              {trainee.email && (
                                <p className="text-xs text-muted-foreground">
                                  ✉️ {trainee.email}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{trainee.level || 'Курсист'}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Няма записани курсисти в тази група</p>
                    </div>
                  )}
                </div>

                {selectedGroupForDetails.status === 'активна' && (
                  <div className="border-t pt-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">Прогрес на обучението</Label>
                    <Progress value={(selectedGroupForDetails.currentDay / 3) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Ден {selectedGroupForDetails.currentDay} от 3</span>
                      <span>{Math.round((selectedGroupForDetails.currentDay / 3) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
