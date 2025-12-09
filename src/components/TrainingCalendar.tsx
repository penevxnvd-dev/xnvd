import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Calendar as CalendarIcon, Users, Award, BookOpen, UserPlus, Clock, Edit, Trash2, Plus, ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, Search, Filter, Download, Printer, Copy, Grid3x3, List, Calendar, BarChart3, Bell, X, MoreVertical, LayoutGrid, LayoutList, GripVertical } from 'lucide-react';
import { TrainingGroup, Agent } from '@/types';
import { UserRole } from '@/hooks/useUserRole';
// Avatar removed - using modern design with initials badges instead
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { toast } from '@/hooks/use-toast';
import { supabaseApi } from '@/lib/supabaseApi';
import { trainingStructure, TrainingSection, calculateTrainingProgress } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
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
  onUpdateGroups?: (groups: TrainingGroup[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  canEdit?: boolean; // Allow managers/leaders/admin to add trainees
  currentUserName?: string;
  currentUserRole?: UserRole;
  currentUserId?: string; // ID of current user for permission checks
  selectedCityId?: string | null; // Selected city ID for regional managers
}

const getTrainingDayLabel = (day: number) => {
  switch (day) {
    case 1:
      return 'Ден 1: Встъпително обучение';
    case 2:
      return 'Ден 2: Разговор с купувач';
    case 3:
      return 'Ден 3: Разговор с продавач и изпит';
    default:
      return 'Неизвестен ден';
  }
};

export const TrainingCalendar = ({
  groups,
  onGroupClick,
  onUpdateGroups,
  canEdit = false,
  currentUserName,
  currentUserRole,
  currentUserId,
  selectedCityId,
}: TrainingCalendarProps) => {
  const navigate = useNavigate();
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
  const [draggedTrainee, setDraggedTrainee] = useState<{ trainee: Agent; groupId: string } | null>(null);
  
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

  const normalize = (name?: string): string => (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const isKrasi = normalize(currentUserName).includes('краси') && normalize(currentUserName).includes('кътев');
  const isKamen = normalize(currentUserName).includes('камен') && normalize(currentUserName).includes('георг');
  const isTeamLeader = currentUserRole === 'team_leader';
  const isRegionalManager = currentUserRole === 'regional_manager';
  const isOfficeManager = currentUserRole === 'office_manager';
  const isRealtor = currentUserRole === 'realtor';

  // State for user's managed cities/office/team
  const [userManagedCities, setUserManagedCities] = useState<string[]>([]); // city IDs
  const [userManagedOffice, setUserManagedOffice] = useState<{ id: string; city_id: string } | null>(null);
  const [userTeam, setUserTeam] = useState<{ id: string; office_id: string } | null>(null);
  const [realtorOffice, setRealtorOffice] = useState<string | null>(null); // office ID for realtors
  const [leaderCityMap, setLeaderCityMap] = useState<Map<string, { cityId: string; cityName: string; officeId: string; officeName: string }>>(new Map());

  // Fetch user's managed cities/office/team
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!currentUserId) return;
      
      try {
        if (isRegionalManager) {
          const cities = await supabaseApi.getUserManagedCities(currentUserId);
          setUserManagedCities(cities.map(c => c.id));
        } else if (isOfficeManager) {
          const office = await supabaseApi.getUserManagedOffice(currentUserId);
          if (office) {
            setUserManagedOffice({ id: office.id, city_id: office.city_id });
          }
        } else if (isTeamLeader) {
          const team = await supabaseApi.getUserTeam(currentUserId);
          if (team) {
            setUserTeam({ id: team.id, office_id: team.office_id });
          }
        } else if (isRealtor) {
          // For realtors, get their office through their team
          const officeId = await supabaseApi.getRealtorOffice(currentUserId);
          if (officeId) {
            setRealtorOffice(officeId);
          }
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      }
    };

    fetchUserPermissions();
  }, [currentUserRole, isRegionalManager, isOfficeManager, isTeamLeader, isRealtor, currentUserId]);

  // Fetch city/office for each leader
  useEffect(() => {
    const fetchLeaderCities = async () => {
      if (!availableLeaders.length) return;
      
      const map = new Map<string, { cityId: string; cityName: string; officeId: string; officeName: string }>();
      
      for (const leader of availableLeaders) {
        try {
          const cityOffice = await supabaseApi.getLeaderCityAndOffice(leader.id);
          if (cityOffice) {
            map.set(leader.id, cityOffice);
          }
        } catch (error) {
          console.error(`Error fetching city/office for leader ${leader.fullName}:`, error);
        }
      }
      
      setLeaderCityMap(map);
    };

    fetchLeaderCities();
  }, [availableLeaders]);

  // Determine allowed cities for viewing/creating groups
  const getAllowedCities = (): string[] | null => {
    if (isKrasi) {
      // Краси Кътев - вижда само Бургас
      return ['Бургас']; // Will match by city name
    } else if (isKamen) {
      // Камен Георгиев - вижда Бургас и Пловдив
      return ['Бургас', 'Пловдив'];
    } else if (isRegionalManager && userManagedCities.length > 0) {
      // Regional manager - вижда градовете в техния регион
      return null; // Will check by city IDs
    } else if (isOfficeManager && userManagedOffice) {
      // Office manager - вижда само своя офис
      return null; // Will check by office ID
    } else if (isTeamLeader && userTeam) {
      // Team leader - вижда групите за офиса
      return null; // Will check by office ID
    }
    return null; // Admin or no restrictions
  };

  const allowedCities = getAllowedCities();

  // Determine if user can create groups for a leader
  const canCreateForLeader = (leaderId?: string, leaderName?: string): boolean => {
    if (!derivedCanEdit) return false;
    
    // If no leaderId, try to find it by name
    let actualLeaderId = leaderId;
    if (!actualLeaderId && leaderName) {
      const leader = availableLeaders.find(l => normalize(l.fullName) === normalize(leaderName));
      actualLeaderId = leader?.id;
    }
    
    if (!actualLeaderId) {
      // For team leaders, check by name match
      if (isTeamLeader && currentUserName && leaderName) {
        return normalize(leaderName) === normalize(currentUserName);
      }
      return false;
    }

    const cityOffice = leaderCityMap.get(actualLeaderId);
    if (!cityOffice) {
      // If city/office not found, fallback to name-based check for team leaders
      if (isTeamLeader && currentUserName && leaderName) {
        return normalize(leaderName) === normalize(currentUserName);
      }
      return false;
    }

    // Краси Кътев - може да записва само в Бургас
    if (isKrasi) {
      return cityOffice.cityName === 'Бургас';
    }

    // Камен Георгиев - може да записва само в Пловдив
    if (isKamen) {
      return cityOffice.cityName === 'Пловдив';
    }

    // Regional manager - може да записва в градовете в техния регион
    if (isRegionalManager && userManagedCities.length > 0) {
      return userManagedCities.includes(cityOffice.cityId);
    }

    // Office manager - може да записва само в своя офис
    if (isOfficeManager && userManagedOffice) {
      return cityOffice.officeId === userManagedOffice.id;
    }

    // Team leader - може да записва само в своя екип
    if (isTeamLeader && userTeam && currentUserName) {
      return normalize(leaderName) === normalize(currentUserName);
    }

    // Admin - може да записва навсякъде
    if (!currentUserRole || currentUserRole === 'admin') {
      return true;
    }

    return false;
  };


  const derivedCanEdit = currentUserRole === 'realtor' ? false : canEdit;

  // Check if user can manage (edit/delete) a group
  const canManageGroup = useCallback((group: TrainingGroup): boolean => {
    if (!currentUserRole) return false;
    
    // Admin has full access
    if (currentUserRole === 'admin') return true;
    
    // Regional manager and office manager have full access
    if (currentUserRole === 'regional_manager' || currentUserRole === 'office_manager') return true;
    
    // Specific users with management rights: Краси Кътев, Камен Георгиев, Георги Пенев, Лазар Бундев
    if (currentUserName) {
      const normalizedName = normalize(currentUserName);
      const hasManagementRights = 
        normalizedName.includes('краси') && normalizedName.includes('кътев') ||
        normalizedName.includes('камен') && normalizedName.includes('георг') ||
        normalizedName.includes('георги') && normalizedName.includes('пенев') ||
        normalizedName.includes('лазар') && normalizedName.includes('бундев');
      
      if (hasManagementRights) return true;
    }
    
    // Creator can manage their own groups (if currentUserId is available)
    if (currentUserId && group.createdBy && group.createdBy === currentUserId) return true;
    
    return false;
  }, [currentUserRole, currentUserId, currentUserName]);

  // Determine if user can view a group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canViewGroup: (group: TrainingGroup) => boolean = (group: TrainingGroup): boolean => {
    // If we don't have leader data yet, allow viewing (fallback)
    if (availableLeaders.length === 0 || leaderCityMap.size === 0) {
      return true;
    }

    // Find leader's city/office
    const leader = availableLeaders.find(l => l.id === group.leaderId || normalize(l.fullName) === normalize(group.leader));
    if (!leader) return true; // If leader not found, allow viewing (fallback)

    const cityOffice = leaderCityMap.get(leader.id);
    if (!cityOffice) return true; // If city/office not found, allow viewing (fallback)

    // Ако има избран град (selectedCityId), филтрираме по град за ВСИЧКИ роли
    // Това гарантира, че календарът за Пловдив не показва групи от Бургас и обратно
    if (selectedCityId) {
      return cityOffice.cityId === selectedCityId;
    }

    // Краси Кътев - вижда само Бургас
    if (isKrasi) {
      return cityOffice.cityName === 'Бургас';
    }

    // Камен Георгиев - вижда Бургас и Пловдив
    if (isKamen) {
      return cityOffice.cityName === 'Бургас' || cityOffice.cityName === 'Пловдив';
    }

    // Regional manager - вижда градовете в техния регион
    if (isRegionalManager) {
      // Ако няма избран град, показва всички градове в техния регион
      if (userManagedCities.length > 0) {
        return userManagedCities.includes(cityOffice.cityId);
      }
    }

    // Office manager - вижда само своя офис
    if (isOfficeManager && userManagedOffice) {
      return cityOffice.officeId === userManagedOffice.id;
    }

    // Team leader - вижда групите за офиса
    if (isTeamLeader && userTeam) {
      // Get office for team
      const teamOffice = userTeam.office_id;
      return cityOffice.officeId === teamOffice;
    }

    // Realtor - вижда групите за офиса на техния team
    if (isRealtor && realtorOffice) {
      return cityOffice.officeId === realtorOffice;
    }

    // Admin - вижда всичко
    return true;
  };

  // Filter groups based on view permissions
  const visibleGroups = useMemo(() => groups.filter(g => canViewGroup(g)), [groups, availableLeaders, leaderCityMap, userManagedCities, userManagedOffice, userTeam, realtorOffice, selectedCityId, isKrasi, isKamen, isRegionalManager, isOfficeManager, isTeamLeader, isRealtor]);
  const activeGroups = useMemo(() => visibleGroups.filter(g => g.status === 'активна'), [visibleGroups]);
  const completedGroups = useMemo(() => visibleGroups.filter(g => g.status === 'завършена'), [visibleGroups]);
  
  // Load team leaders from database
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        console.log('Fetching team leaders from database...');
        const leaders = await supabaseApi.getAllTeamLeaders();
        console.log('Fetched leaders:', leaders);

        // Filter leaders based on permissions
        let filtered = leaders || [];
        
        if (isKrasi) {
          // Краси Кътев - вижда само ръководители от Бургас
          // Will filter after we have city info
        } else if (isKamen) {
          // Камен Георгиев - вижда ръководители от Бургас и Пловдив
          // Will filter after we have city info
        } else if (isTeamLeader && currentUserName) {
          // Team leader - вижда само себе си
          filtered = leaders.filter((l) => normalize(l.fullName) === normalize(currentUserName));
        }

        if (filtered && filtered.length > 0) {
          setAvailableLeaders(filtered);
          if (!selectedLeader && filtered.length > 0) {
            setSelectedLeader(filtered[0].fullName);
          }
        } else {
          console.log('No leaders matching permissions');
          setAvailableLeaders([]);
        }
      } catch (error) {
        console.error('Error fetching team leaders:', error);
        setAvailableLeaders([]);
      }
    };
    
    fetchLeaders();
  }, [groups, selectedLeader, currentUserRole, currentUserName, isTeamLeader, isKrasi, isKamen]);

  // Filter leaders based on city permissions after we have city info
  useEffect(() => {
    if (leaderCityMap.size === 0 || availableLeaders.length === 0) return;

    let filtered = availableLeaders;

    if (isKrasi) {
      // Краси Кътев - вижда само ръководители от Бургас
      filtered = availableLeaders.filter(leader => {
        const cityOffice = leaderCityMap.get(leader.id);
        return cityOffice && cityOffice.cityName === 'Бургас';
      });
    } else if (isKamen) {
      // Камен Георгиев - вижда ръководители от Бургас и Пловдив
      filtered = availableLeaders.filter(leader => {
        const cityOffice = leaderCityMap.get(leader.id);
        return cityOffice && (cityOffice.cityName === 'Бургас' || cityOffice.cityName === 'Пловдив');
      });
    } else if (isRegionalManager && userManagedCities.length > 0) {
      // Regional manager - вижда ръководители от градовете в техния регион
      filtered = availableLeaders.filter(leader => {
        const cityOffice = leaderCityMap.get(leader.id);
        return cityOffice && userManagedCities.includes(cityOffice.cityId);
      });
    } else if (isOfficeManager && userManagedOffice) {
      // Office manager - вижда ръководители от своя офис
      filtered = availableLeaders.filter(leader => {
        const cityOffice = leaderCityMap.get(leader.id);
        return cityOffice && cityOffice.officeId === userManagedOffice.id;
      });
    }

    if (filtered.length !== availableLeaders.length) {
      setAvailableLeaders(filtered);
      if (!selectedLeader && filtered.length > 0) {
        setSelectedLeader(filtered[0].fullName);
      }
    }
  }, [leaderCityMap, userManagedCities, userManagedOffice, isKrasi, isKamen, isRegionalManager, isOfficeManager]);

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
  const [selectedTraineeForTraining, setSelectedTraineeForTraining] = useState<Agent | null>(null);
  const [traineeTrainingData, setTraineeTrainingData] = useState<TrainingSection[]>([]);
  const [traineeUserId, setTraineeUserId] = useState<string | null>(null);
  const [traineeRealtorId, setTraineeRealtorId] = useState<string | null>(null);
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] = useState(false);
  const [traineeForAccountCreation, setTraineeForAccountCreation] = useState<Agent | null>(null);
  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  // Map to store training progress for each trainee (key: trainee email or id)
  const [traineeProgressMap, setTraineeProgressMap] = useState<Map<string, number>>(new Map());

  // Load training progress for all trainees in a group
  const loadTraineesProgress = useCallback(async (trainees: Agent[]) => {
    const progressMap = new Map<string, number>();
    
    for (const trainee of trainees) {
      if (!trainee.email) continue;
      
      try {
        // Find profile by email
        const { data: profile } = await supabaseApi.supabase
          .from('profiles')
          .select('id')
          .eq('email', trainee.email)
          .single();

        if (!profile) continue;

        // Get realtor by user_id
        const { data: realtor } = await supabaseApi.supabase
          .from('realtors')
          .select('id')
          .eq('user_id', profile.id)
          .single();

        if (!realtor) continue;

        // Get training progress
        const progressData = await supabaseApi.getTrainingProgress(profile.id);

        if (progressData && progressData.length > 0) {
          // Map progress data to training structure
          const updatedData = trainingStructure.map((section) => ({
            ...section,
            subsections: section.subsections.map((subsection) => {
              const progressItem = progressData.find(
                (p: { section?: string; subsection?: string }) => 
                  p.section === section.id && p.subsection === subsection.id
              );
              return {
                ...subsection,
                progress: progressItem
                  ? {
                      lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                      video: (progressItem as { video_completed?: boolean }).video_completed || false,
                      practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                      handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                      exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                    }
                  : subsection.progress,
              };
            }),
          }));

          // Calculate progress percentage
          const progress = calculateTrainingProgress(updatedData);
          progressMap.set(trainee.email, progress);
        } else {
          progressMap.set(trainee.email, 0);
        }
      } catch (error) {
        console.error(`Error loading progress for trainee ${trainee.email}:`, error);
        progressMap.set(trainee.email, 0);
      }
    }

    setTraineeProgressMap(prev => {
      const newMap = new Map(prev);
      progressMap.forEach((value, key) => newMap.set(key, value));
      return newMap;
    });
  }, []);

  // Load trainees progress when group details dialog opens
  useEffect(() => {
    if (selectedGroupForDetails && isGroupDetailsDialogOpen && selectedGroupForDetails.trainees) {
      loadTraineesProgress(selectedGroupForDetails.trainees);
    }
  }, [selectedGroupForDetails, isGroupDetailsDialogOpen, loadTraineesProgress]);

  // Load progress for all trainees in active groups on initial load
  useEffect(() => {
    if (activeGroups.length > 0) {
      const allTrainees = activeGroups.flatMap(g => g.trainees || []);
      if (allTrainees.length > 0) {
        loadTraineesProgress(allTrainees);
      }
    }
  }, [activeGroups.length, loadTraineesProgress]); // Only run when number of active groups changes

  // Load training progress for a trainee
  const loadTraineeTrainingProgress = useCallback(async (trainee: Agent) => {
    try {
      // Find profile by email
      if (!trainee.email) {
        toast({
          title: 'Грешка',
          description: 'Курсистът няма имейл адрес.',
          variant: 'destructive',
        });
        return;
      }

      const { data: profile } = await supabaseApi.supabase
        .from('profiles')
        .select('id')
        .eq('email', trainee.email)
        .single();

      if (!profile) {
        toast({
          title: 'Грешка',
          description: 'Профилът на курсиста не е намерен.',
          variant: 'destructive',
        });
        return;
      }

      setTraineeUserId(profile.id);

      // Get realtor by user_id
      const { data: realtor } = await supabaseApi.supabase
        .from('realtors')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (!realtor) {
        toast({
          title: 'Грешка',
          description: 'Курсистът все още няма профил като реализатор.',
          variant: 'destructive',
        });
        return;
      }

      setTraineeRealtorId(realtor.id);

      // Get training progress
      const progressData = await supabaseApi.getTrainingProgress(profile.id);

      // Update training structure with progress
      const updatedData = trainingStructure.map((section) => ({
        ...section,
        subsections: section.subsections.map((subsection) => {
          const progressItem = progressData.find(
            (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
          );
          return {
            ...subsection,
            progress: progressItem
              ? {
                  lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                  video: (progressItem as { video_completed?: boolean }).video_completed || false,
                  practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                  handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                  exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                }
              : subsection.progress,
          };
        }),
      }));

      setTraineeTrainingData(updatedData);
      setSelectedTraineeForTraining(trainee);
    } catch (error) {
      console.error('Error loading trainee training progress:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно зареждане на данни за обучение.',
        variant: 'destructive',
      });
    }
  }, []);

  // Handle training progress update
  const handleTraineeTrainingProgressUpdate = useCallback(async (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => {
    if (!traineeRealtorId) return;

    // Save current state for potential revert
    const previousData = traineeTrainingData;

    // Update local state
    setTraineeTrainingData((currentData) => {
      return currentData.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            subsections: section.subsections.map((subsection) => {
              if (subsection.id === subsectionId) {
                const newProgress = {
                  ...subsection.progress,
                  [field]: checked,
                };
                
                // If exam is completed, automatically mark all other steps as completed
                if (field === 'exam' && checked) {
                  return {
                    ...subsection,
                    progress: {
                      lecture: true,
                      video: true,
                      practical: true,
                      handover: true,
                      exam: true,
                    },
                  };
                }
                
                return {
                  ...subsection,
                  progress: newProgress,
                };
              }
              return subsection;
            }),
          };
        }
        return section;
      });
    });

    // Save to database
    try {
      await supabaseApi.updateTrainingProgress({
        realtorId: traineeRealtorId,
        section: sectionId,
        subsection: subsectionId,
        lectureCompleted: field === 'lecture' ? checked : undefined,
        videoCompleted: field === 'video' ? checked : undefined,
        practicalCompleted: field === 'practical' ? checked : undefined,
        handoverCompleted: field === 'handover' ? checked : undefined,
        examCompleted: field === 'exam' ? checked : undefined,
      });

      // Update progress in the map
      if (selectedTraineeForTraining?.email) {
        const updatedProgress = calculateTrainingProgress(traineeTrainingData);
        setTraineeProgressMap(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedTraineeForTraining.email!, updatedProgress);
          return newMap;
        });
      }

      toast({
        title: 'Прогресът е обновен',
        description: 'Промените са запазени успешно.',
      });
    } catch (error) {
      console.error('Error updating training progress:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно запазване на промените.',
        variant: 'destructive',
      });
      // Revert local state on error
      setTraineeTrainingData(previousData);
    }
  }, [traineeRealtorId, selectedTraineeForTraining]);

  const handleAdvanceGroupDay = async (group: TrainingGroup) => {
    if (!onUpdateGroups) return;
    const newDay = Math.min((group.currentDay || 0) + 1, 3);
    const leader = availableLeaders.find(l => l.id === group.leaderId || normalize(l.fullName) === normalize(group.leader));
    if (!canCreateForLeader(leader?.id, group.leader)) {
      toast({
        title: 'Нямате права за този ръководител',
        description: 'Можете да маркирате само групи на вашия екип/правомощия.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update group in database
      await supabaseApi.updateTrainingGroup(group.id, {
        currentDay: newDay,
        status: newDay >= 3 ? 'завършена' : 'активна',
      });

      // Update all trainees in the group
      await Promise.all(
        group.trainees.map((trainee) =>
          supabaseApi.updateTrainee(trainee.id, {
            trainingStage: Math.min(newDay, 5),
            level: 'Чирак',
            position: 'Етап обучение',
          })
        )
      );

      const updatedGroups = groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              status: newDay >= 3 ? 'завършена' : 'активна',
              currentDay: newDay,
              trainees: g.trainees.map((t) => ({
                ...t,
                trainingStage: Math.min(newDay, 5),
                level: t.level || 'Чирак',
                position: 'Етап обучение',
              })),
            }
          : g
      );
      onUpdateGroups(updatedGroups);
      setSelectedGroupForDetails((prev) =>
        prev && prev.id === group.id
          ? {
              ...prev,
              status: newDay >= 3 ? 'завършена' : 'активна',
              currentDay: newDay,
              trainees: prev.trainees.map((t) => ({
                ...t,
                trainingStage: Math.min(newDay, 5),
                level: t.level || 'Чирак',
                position: 'Етап обучение',
              })),
            }
          : prev
      );
      toast({
        title: 'Обучението е маркирано',
        description: `Групата е преминала към ден ${newDay}.`,
      });
    } catch (error) {
      console.error('Error advancing group day:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно обновяване на групата.',
        variant: 'destructive',
      });
    }
  };

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
      setNewTrainee({ name: '', phone: '', position: '', selectedDate: '', email: '' });
    }
  };

  const handleEditTrainee = (trainee: Agent, groupId?: string) => {
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

  const handleSaveEdit = async () => {
    if (!editingTrainee) return;

    try {
      if (editingTrainee.groupId) {
        // Update trainee in database
        await supabaseApi.updateTrainee(editingTrainee.id, {
          name: editingTrainee.name,
          phone: editingTrainee.phone,
          position: editingTrainee.position,
        });

        // Update local state
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
        // Редактиране на курсист от предстоящи групи (not in database yet)
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
    } catch (error) {
      console.error('Error updating trainee:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно обновяване на курсиста.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете тази група? Това действие не може да бъде отменено.')) {
      return;
    }

    try {
      // Delete from database
      await supabaseApi.deleteTrainingGroup(groupId);
      
      // Update local state
      const updatedGroups = groups.filter(g => g.id !== groupId);
      onUpdateGroups?.(updatedGroups);
      
      toast({
        title: "Група изтрита!",
        description: "Групата е успешно изтрита.",
      });
      
      setIsGroupDetailsDialogOpen(false);
      setSelectedGroupForDetails(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно изтриване на групата.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTrainee = async (traineeId: string, groupId?: string) => {
    try {
      if (groupId) {
        // Delete from database
        await supabaseApi.deleteTrainee(traineeId);
        
        // Update local state
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
        // Изтриване от предстоящи групи (not in database yet)
        setRegisteredTrainees(prev => prev.filter(t => t.id !== traineeId));
      }

      toast({
        title: "Курсистът е премахнат",
        description: "Курсистът беше успешно изтрит.",
      });
    } catch (error) {
      console.error('Error deleting trainee:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно изтриване на курсиста.',
        variant: 'destructive',
      });
    }
  };

  const handleAddToGroup = (groupId: string) => {
    setAddToGroupId(groupId);
    setIsAddDialogOpen(true);
  };

  const handleSaveNewGroupTrainee = async () => {
    if (!addToGroupId || !newGroupTrainee.name || !newGroupTrainee.phone || !newGroupTrainee.position) return;

    try {
      // Add trainee to database
      const trainee = await supabaseApi.addTraineeToGroup(addToGroupId, {
        name: newGroupTrainee.name,
        phone: newGroupTrainee.phone,
        email: '',
        position: newGroupTrainee.position,
      });

      // Update local state
      const updatedGroups = groups.map(group => {
        if (group.id === addToGroupId) {
          return {
            ...group,
            trainees: [...group.trainees, {
              id: trainee.id,
              name: trainee.name,
              phone: trainee.phone || '',
              position: trainee.position || '',
              level: (trainee.level || 'Чирак') as const,
              trainingStage: (trainee.training_stage || 1) as const,
              dateOfHiring: new Date().toISOString().split('T')[0],
              email: trainee.email || '',
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
    } catch (error) {
      console.error('Error adding trainee:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно добавяне на курсиста.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyGroup = async (group: TrainingGroup) => {
    try {
      const newStartDate = format(addDays(parse(group.startDate, 'yyyy-MM-dd', new Date()), 7), 'yyyy-MM-dd');
      
      // Create new group in database
      const newGroupData = await supabaseApi.createTrainingGroup({
        startDate: newStartDate,
        leaderId: group.leaderId,
        currentDay: 0,
        status: 'предстояща',
      });

      // Copy all trainees to the new group
      const newTrainees = await Promise.all(
        group.trainees.map(trainee =>
          supabaseApi.addTraineeToGroup(newGroupData.id, {
            name: trainee.name,
            phone: trainee.phone,
            email: trainee.email,
            position: trainee.position,
          })
        )
      );

      const newGroup: TrainingGroup = {
        id: newGroupData.id,
        startDate: newStartDate,
        leader: group.leader,
        leaderId: group.leaderId,
        currentDay: 0,
        status: 'предстояща',
        trainees: newTrainees.map((t, idx) => ({
          ...group.trainees[idx],
          id: t.id,
        })),
      };
      
      onUpdateGroups?.([...groups, newGroup]);
      toast({
        title: "Група копирана!",
        description: `Групата е копирана за ${newStartDate}.`,
      });
    } catch (error) {
      console.error('Error copying group:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно копиране на групата.',
        variant: 'destructive',
      });
    }
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

  const handleDragEnd = async (event: DragEndEvent) => {
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

    try {
      // Update trainee's group_id in database
      await supabaseApi.updateTrainee(traineeId, {
        groupId: targetGroupId,
      });

      // Update local state
      const updatedGroups = groups.map(g => {
        if (g.id === sourceGroup.id) {
          return {
            ...g,
            trainees: g.trainees.filter(t => t.id !== traineeId)
          };
        }
        if (g.id === targetGroup.id) {
          return {
            ...g,
            trainees: [...g.trainees, draggedTrainee.trainee]
          };
        }
        return g;
      });

      onUpdateGroups?.(updatedGroups);
      toast({
        title: "Курсист преместен!",
        description: `${draggedTrainee.trainee.name} е преместен/а от ${sourceGroup.leader} към ${targetGroup.leader}.`,
      });
    } catch (error) {
      console.error('Error moving trainee:', error);
      toast({
        title: 'Грешка',
        description: 'Неуспешно преместване на курсиста.',
        variant: 'destructive',
      });
    }
  };

  // Sortable Trainee Item Component
  const SortableTraineeItem = ({ trainee, groupId, onEdit, onDelete }: { 
    trainee: Agent; 
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
            <p className="font-medium text-foreground truncate">{formatNameWithEmoji(trainee.name)}</p>
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
            <DialogDescription>
              Редактирайте информацията за курсиста.
            </DialogDescription>
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
            <DialogDescription>
              Добавете нов курсист към група за обучение.
            </DialogDescription>
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
                          {formatNameWithEmoji(t.name)} - {t.phone}
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
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list' | 'grid' | 'timeline')} className="w-full">
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
                    status: 'предстояща' as 'активна' | 'завършена' | 'предстояща',
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
                    <ContextMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                                    const formattedLeader = formatNameWithEmoji(group.leader || '');
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
                                    const leader = availableLeaders.find(l => l.id === group.leaderId || normalize(l.fullName) === normalize(group.leader));
                                    // Always show details dialog for active groups
                                    if (isActive || isCompleted || !canCreateForLeader(leader?.id, group.leader)) {
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
                                        {formattedLeader || (traineeCount > 0 ? `${traineeCount} курсисти` : '')}
                                        </span>
                                        {traineeCount > 0 && (
                                          <span className="flex-shrink-0 font-bold">
                                            {traineeCount}
                                          </span>
                                        )}
                                        {canManageGroup(group) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-4 w-4 p-0 opacity-0 group-hover/item:opacity-100 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive ml-1 flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedGroupForDetails(group);
                                              setIsGroupDetailsDialogOpen(true);
                                            }}
                                            title="Управление на група"
                                          >
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
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
                        </TooltipTrigger>
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
                          {dayGroups.length > 0 && dayGroups.some(g => canManageGroup(g)) && (
                            <>
                              <ContextMenuSeparator />
                              {dayGroups.filter(g => canManageGroup(g)).map((group) => (
                                <div key={group.id}>
                                  <ContextMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedGroupForDetails(group);
                                      setIsGroupDetailsDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Редактирай: {formatNameWithEmoji(group.leader)}
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Сигурни ли сте, че искате да изтриете групата на ${group.leader}?`)) {
                                        handleDeleteGroup(group.id);
                                      }
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Изтрий: {formatNameWithEmoji(group.leader)}
                                  </ContextMenuItem>
                                </div>
                              ))}
                            </>
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
                        <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-semibold">{format(day, 'EEEE, d MMMM yyyy', { locale: bg })}</p>
                          {dayGroups.length > 0 ? (
                            <>
                              <p className="text-sm">Групи: {dayGroups.length}</p>
                              <p className="text-sm">Курсисти: {totalTrainees}</p>
                              {dayGroups.map((g, i) => (
                                <div key={i} className="text-xs">
                                  {g.leader && <p>{formatNameWithEmoji(g.leader)}</p>}
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
                    </ContextMenu>
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
                          {formatNameWithEmoji(g.leader)} - {g.trainees.length} курсисти
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
                        <h4 className="font-semibold">{formatNameWithEmoji(g.leader)}</h4>
                        <Badge>{g.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{g.trainees.length} курсисти</p>
                      <div className="space-y-1">
                        {g.trainees.map(t => (
                          <div key={t.id} className="text-sm">{formatNameWithEmoji(t.name)} - {t.position}</div>
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
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30">
                            {group.leader.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{formatNameWithEmoji(group.leader)}</p>
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
                          {group.trainees.length > 0 && (
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Среден прогрес: {(() => {
                                  const traineesWithEmail = group.trainees.filter(t => t.email);
                                  if (traineesWithEmail.length === 0) return '0%';
                                  const totalProgress = traineesWithEmail.reduce((sum, t) => {
                                    const progress = t.email ? (traineeProgressMap.get(t.email) || 0) : 0;
                                    return sum + progress;
                                  }, 0);
                                  return Math.round(totalProgress / traineesWithEmail.length) + '%';
                                })()}
                              </span>
                            </div>
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
                        {canManageGroup(group) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedGroupForDetails(group);
                                setIsGroupDetailsDialogOpen(true);
                              }}
                              title="Редактирай група"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  title="Изтрий група"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Сигурни ли сте?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Това действие не може да бъде отменено. Групата и всички курсисти в нея ще бъдат изтрити.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отказ</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Изтрий
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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
            <DialogDescription>
              Преглед и управление на групите за обучение за избраната дата.
            </DialogDescription>
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
                    status: 'предстояща' as 'активна' | 'завършена' | 'предстояща',
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
                          // Add to existing group in database
                          (async () => {
                            try {
                              const leader = availableLeaders.find(l => normalize(l.fullName) === normalize(selectedLeader));
                              if (!leader) {
                                toast({
                                  title: 'Грешка',
                                  description: 'Ръководителят не е намерен.',
                                  variant: 'destructive',
                                });
                                return;
                              }

                              const trainee = await supabaseApi.addTraineeToGroup(existingGroup.id, {
                                name: newTrainee.name,
                                phone: newTrainee.phone,
                                email: newTrainee.email || '',
                                position: newTrainee.position,
                              });

                              const updatedGroups = groups.map(g => 
                                g.id === existingGroup.id
                                  ? { ...g, trainees: [...g.trainees, {
                                    ...newTraineeData,
                                    id: trainee.id,
                                  }] }
                                  : g
                              );
                              onUpdateGroups?.(updatedGroups);
                              setNewTrainee({ name: '', phone: '', position: '', selectedDate: '', email: '' });
                              setIsDateDialogOpen(false);
                              toast({
                                title: "Курсист добавен!",
                                description: `${newTrainee.name} е добавен/а към групата на ${existingGroup.leader}.`,
                              });
                            } catch (error) {
                              console.error('Error adding trainee:', error);
                              toast({
                                title: 'Грешка',
                                description: 'Неуспешно добавяне на курсиста.',
                                variant: 'destructive',
                              });
                            }
                          })();
                        } else {
                          // Create new group in database
                          (async () => {
                            try {
                              const leader = availableLeaders.find(l => normalize(l.fullName) === normalize(selectedLeader));
                              if (!leader) {
                                toast({
                                  title: 'Грешка',
                                  description: 'Ръководителят не е намерен.',
                                  variant: 'destructive',
                                });
                                return;
                              }

                              const group = await supabaseApi.createTrainingGroup({
                                startDate: dateKey,
                                leaderId: leader.id,
                                currentDay: 1,
                                status: 'активна',
                              });

                              // Add trainee to the new group
                              const trainee = await supabaseApi.addTraineeToGroup(group.id, {
                                name: newTrainee.name,
                                phone: newTrainee.phone,
                                email: newTrainee.email || '',
                                position: newTrainee.position,
                              });

                              const newGroup: TrainingGroup = {
                                id: group.id,
                                startDate: dateKey,
                                leader: selectedLeader,
                                leaderId: leader.id,
                                currentDay: 1,
                                status: 'активна',
                                trainees: [{
                                  ...newTraineeData,
                                  id: trainee.id,
                                }]
                              };
                              onUpdateGroups?.([...groups, newGroup]);
                              setNewTrainee({ name: '', phone: '', position: '', selectedDate: '', email: '' });
                              setIsDateDialogOpen(false);
                              toast({
                                title: "Група създадена!",
                                description: `Нова група с ръководител ${selectedLeader} е създадена за ${format(selectedDate, 'dd.MM.yyyy', { locale: bg })}.`,
                              });
                            } catch (error) {
                              console.error('Error creating group:', error);
                              toast({
                                title: 'Грешка',
                                description: 'Неуспешно създаване на групата.',
                                variant: 'destructive',
                              });
                            }
                          })();
                        }
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
                          {availableLeaders
                            .filter((leader) => canCreateForLeader(leader.id, leader.fullName))
                            .map((leader) => (
                              <SelectItem key={leader.id} value={leader.fullName}>
                                {formatNameWithEmoji(leader.fullName)}
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
                        <Card key={group.id} className="p-4 hover:shadow-lg transition-shadow">
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
                                onClick={() => {
                                  setSelectedGroupForDetails(group);
                                  setIsGroupDetailsDialogOpen(true);
                                  setIsDateDialogOpen(false);
                                }}
                                title="Редактирай група"
                                disabled={!canManageGroup(group)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    title="Изтрий група"
                                    disabled={!canManageGroup(group)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Сигурни ли сте?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Това действие не може да бъде отменено. Групата и всички курсисти в нея ще бъдат изтрити.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отказ</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        handleDeleteGroup(group.id);
                                        setIsDateDialogOpen(false);
                                      }}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Изтрий
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30">
                                {group.leader.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{formatNameWithEmoji(group.leader)}</p>
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
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30">
                                {group.leader.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{formatNameWithEmoji(group.leader)}</p>
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
            <DialogDescription>
              Добавете нов курсист към групата за обучение.
            </DialogDescription>
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
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!canEdit) {
                  toast({
                    title: "Нямате права",
                    description: "Само мениджъри/лидери могат да добавят курсисти.",
                    variant: "destructive"
                  });
                  return;
                }
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
                  
                  try {
                    const trainee = await supabaseApi.addTraineeToGroup(selectedGroupForAddTrainee.id, {
                      name: newTraineeForGroup.name,
                      phone: newTraineeForGroup.phone,
                      email: newTraineeForGroup.email || '',
                      position: newTraineeForGroup.position,
                    });

                    const updatedGroups = groups.map(g => 
                      g.id === selectedGroupForAddTrainee.id
                        ? { ...g, trainees: [...g.trainees, {
                          ...newTraineeData,
                          id: trainee.id,
                        }] }
                        : g
                    );
                    
                    onUpdateGroups?.(updatedGroups);
                    toast({
                      title: "Курсист добавен!",
                      description: `${newTraineeForGroup.name} е добавен/а към групата на ${selectedGroupForAddTrainee.leader}.`,
                    });
                  } catch (error) {
                    console.error('Error adding trainee:', error);
                    toast({
                      title: 'Грешка',
                      description: 'Неуспешно добавяне на курсиста.',
                      variant: 'destructive',
                    });
                  }
                  
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
              <DialogDescription>
                {selectedGroupForDetails && `Детайли за групата на ${selectedGroupForDetails.leader}. Дата на започване: ${format(parse(selectedGroupForDetails.startDate, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy', { locale: bg })}`}
              </DialogDescription>
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
                  {selectedGroupForDetails.trainees && selectedGroupForDetails.trainees.length > 0 && (
                    <div className="col-span-2">
                      <Label className="text-sm text-muted-foreground">Среден прогрес на обучение</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {(() => {
                              const traineesWithEmail = selectedGroupForDetails.trainees.filter(t => t.email);
                              if (traineesWithEmail.length === 0) return 'Няма курсисти с имейл';
                              const totalProgress = traineesWithEmail.reduce((sum, t) => {
                                const progress = t.email ? (traineeProgressMap.get(t.email) || 0) : 0;
                                return sum + progress;
                              }, 0);
                              const avgProgress = Math.round(totalProgress / traineesWithEmail.length);
                              return `${avgProgress}% (${traineesWithEmail.length} курсисти)`;
                            })()}
                          </span>
                        </div>
                        <Progress 
                          value={(() => {
                            const traineesWithEmail = selectedGroupForDetails.trainees.filter(t => t.email);
                            if (traineesWithEmail.length === 0) return 0;
                            const totalProgress = traineesWithEmail.reduce((sum, t) => {
                              const progress = t.email ? (traineeProgressMap.get(t.email) || 0) : 0;
                              return sum + progress;
                            }, 0);
                            return Math.round(totalProgress / traineesWithEmail.length);
                          })()} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Записани курсисти</Label>
                  {selectedGroupForDetails.trainees && selectedGroupForDetails.trainees.length > 0 ? (
                    <div className="space-y-2">
                      {selectedGroupForDetails.trainees.map((trainee, idx) => (
                        <Card key={trainee.id || idx} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30 flex-shrink-0">
                              {trainee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{formatNameWithEmoji(trainee.name)}</p>
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
                              {trainee.introCompleted && (
                                <Badge variant="default" className="mt-2 bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Встъпително обучение завършено
                                </Badge>
                              )}
                              {trainee.email && traineeProgressMap.has(trainee.email) && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Прогрес на обучение:</span>
                                    <span className="font-semibold">{traineeProgressMap.get(trainee.email) || 0}%</span>
                                  </div>
                                  <Progress 
                                    value={traineeProgressMap.get(trainee.email) || 0} 
                                    className="h-2"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Badge variant="outline">{trainee.level || 'Курсист'}</Badge>
                              {trainee.introCompleted && canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => loadTraineeTrainingProgress(trainee)}
                                >
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  Етапи на обучение
                                </Button>
                              )}
                              {selectedGroupForDetails.status === 'активна' && (
                                <>
                                  {!trainee.introCompleted ? (
                                    canEdit ? (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                          setTraineeForAccountCreation(trainee);
                                          setAccountData({
                                            email: trainee.email || '',
                                            password: '',
                                            confirmPassword: ''
                                          });
                                          setIsCreateAccountDialogOpen(true);
                                        }}
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Маркирай встъпително обучение
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Очаква маркиране
                                      </Badge>
                                    )
                                  ) : null}
                                </>
                              )}
                            </div>
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

                {/* Training Stages Section */}
                {selectedTraineeForTraining && traineeTrainingData.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-base font-semibold block">
                          Етапи на обучение: {formatNameWithEmoji(selectedTraineeForTraining.name)}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Маркирайте подточките на обучение за курсиста
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTraineeForTraining(null);
                          setTraineeTrainingData([]);
                          setTraineeUserId(null);
                          setTraineeRealtorId(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Calculate overall progress */}
                    {(() => {
                      const totalSubsections = traineeTrainingData.reduce((sum, section) => sum + section.subsections.length, 0);
                      const completedSubsections = traineeTrainingData.reduce((sum, section) => 
                        sum + section.subsections.filter(sub => 
                          sub.progress.lecture && 
                          sub.progress.video && 
                          sub.progress.practical && 
                          sub.progress.handover && 
                          sub.progress.exam
                        ).length, 0
                      );
                      const overallProgress = totalSubsections > 0 ? (completedSubsections / totalSubsections) * 100 : 0;
                      
                      return (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Общ прогрес на обучението</Label>
                            <span className="text-sm font-bold">{Math.round(overallProgress)}%</span>
                          </div>
                          <Progress value={overallProgress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Завършени {completedSubsections} от {totalSubsections} подточки</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Training Sections */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {traineeTrainingData.map((section) => (
                        <TrainingSectionCard
                          key={section.id}
                          section={section}
                          onProgressUpdate={handleTraineeTrainingProgressUpdate}
                          editable={canEdit}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedGroupForDetails.status === 'активна' && (
                  <div className="border-t pt-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">Прогрес на обучението</Label>
                    <Progress value={(selectedGroupForDetails.currentDay / 3) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Ден {selectedGroupForDetails.currentDay} от 3</span>
                      <span>{Math.round((selectedGroupForDetails.currentDay / 3) * 100)}%</span>
                    </div>
                    {canEdit && (
                      <div className="mt-3 space-y-2">
                        {/* Check if all trainees have completed intro */}
                        {selectedGroupForDetails.currentDay === 1 && 
                         selectedGroupForDetails.trainees.some(t => !t.introCompleted) && (
                          <Button
                            className="w-full"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await supabaseApi.markIntroCompleted(selectedGroupForDetails.id);
                                const updatedGroups = groups.map(g =>
                                  g.id === selectedGroupForDetails.id
                                    ? {
                                        ...g,
                                        trainees: g.trainees.map(t => ({
                                          ...t,
                                          introCompleted: true,
                                        })),
                                      }
                                    : g
                                );
                                onUpdateGroups?.(updatedGroups);
                                setSelectedGroupForDetails((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        trainees: prev.trainees.map(t => ({
                                          ...t,
                                          introCompleted: true,
                                        })),
                                      }
                                    : null
                                );
                                toast({
                                  title: 'Встъпително обучение маркирано',
                                  description: 'Всички курсисти са маркирани като завършили встъпително обучение.',
                                });
                              } catch (error) {
                                console.error('Error marking intro as completed:', error);
                                toast({
                                  title: 'Грешка',
                                  description: 'Неуспешно маркиране на встъпително обучение.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Маркирай "Встъпително обучение" като завършено
                          </Button>
                        )}
                        {selectedGroupForDetails.currentDay < 3 && (
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => handleAdvanceGroupDay(selectedGroupForDetails)}
                            disabled={
                              selectedGroupForDetails.currentDay === 1 &&
                              selectedGroupForDetails.trainees.some(t => !t.introCompleted)
                            }
                          >
                            Маркирай ден като завършен
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedGroupForDetails && canManageGroup(selectedGroupForDetails) && (
              <div className="border-t pt-4 mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Add edit group functionality
                    toast({
                      title: "Редактиране на група",
                      description: "Функционалността за редактиране ще бъде добавена скоро.",
                    });
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Редактирай група
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Изтрий група
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Сигурни ли сте?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Това действие не може да бъде отменено. Групата и всички курсисти в нея ще бъдат изтрити.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отказ</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteGroup(selectedGroupForDetails.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Изтрий
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Account Dialog */}
        <Dialog open={isCreateAccountDialogOpen} onOpenChange={setIsCreateAccountDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Създаване на акаунт
              </DialogTitle>
              <DialogDescription>
                Въведете данни за създаване на акаунт за {traineeForAccountCreation?.name}. Ролята ще бъде "Чирак".
              </DialogDescription>
            </DialogHeader>
            {traineeForAccountCreation && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                
                if (!accountData.email || !accountData.password) {
                  toast({
                    title: 'Грешка',
                    description: 'Моля попълнете всички задължителни полета.',
                    variant: 'destructive',
                  });
                  return;
                }

                if (accountData.password.length < 6) {
                  toast({
                    title: 'Грешка',
                    description: 'Паролата трябва да е поне 6 символа.',
                    variant: 'destructive',
                  });
                  return;
                }

                if (accountData.password !== accountData.confirmPassword) {
                  toast({
                    title: 'Грешка',
                    description: 'Паролите не съвпадат.',
                    variant: 'destructive',
                  });
                  return;
                }

                try {
                  // Mark intro as completed
                  await supabaseApi.markTraineeIntroCompleted(traineeForAccountCreation.id);
                  
                  // Get team ID from group leader
                  const leader = availableLeaders.find(l => 
                    l.id === selectedGroupForDetails?.leaderId || 
                    (selectedGroupForDetails && normalize(l.fullName) === normalize(selectedGroupForDetails.leader))
                  );
                  
                  // Find team for this leader
                  let teamId: string | undefined;
                  if (leader) {
                    const team = await supabaseApi.getUserTeam(leader.id);
                    teamId = team?.id;
                  }

                  // Create account with provided email and password
                  const { data: authData, error: authError } = await supabaseApi.supabase.auth.signUp({
                    email: accountData.email.trim(),
                    password: accountData.password,
                    options: {
                      data: {
                        full_name: traineeForAccountCreation.name,
                      },
                    },
                  });

                  if (authError) {
                    if (authError.message.includes('User already registered')) {
                      throw new Error('Потребител с този имейл вече съществува.');
                    }
                    throw authError;
                  }

                  if (!authData.user) {
                    throw new Error('Неуспешно създаване на акаунт.');
                  }

                  const profileId = authData.user.id;

                  // Profile is automatically created by trigger, but we may need to update it
                  // Wait a bit for trigger to complete
                  await new Promise(resolve => setTimeout(resolve, 500));

                  // Update profile if needed (trigger should have created it)
                  const { error: profileUpdateError } = await supabaseApi.supabase
                    .from('profiles')
                    .update({
                      full_name: traineeForAccountCreation.name,
                      email: accountData.email.trim(),
                    })
                    .eq('id', profileId);

                  // If update fails, try insert (in case trigger didn't work)
                  if (profileUpdateError) {
                    const { error: profileInsertError } = await supabaseApi.supabase
                      .from('profiles')
                      .insert({
                        id: profileId,
                        full_name: traineeForAccountCreation.name,
                        email: accountData.email.trim(),
                      });
                    
                    if (profileInsertError && !profileInsertError.message.includes('duplicate')) {
                      throw profileInsertError;
                    }
                  }

                  // Assign realtor role (Чирак = level 1)
                  // Check if role already exists
                  const { data: existingRole } = await supabaseApi.supabase
                    .from('user_roles')
                    .select('id')
                    .eq('user_id', profileId)
                    .eq('role', 'realtor')
                    .single();

                  if (!existingRole) {
                    const { error: roleError } = await supabaseApi.supabase
                      .from('user_roles')
                      .insert({
                        user_id: profileId,
                        role: 'realtor',
                      });

                    if (roleError) throw roleError;
                  }

                  // Create realtor record
                  // Check if realtor already exists
                  const { data: existingRealtor } = await supabaseApi.supabase
                    .from('realtors')
                    .select('id')
                    .eq('user_id', profileId)
                    .single();

                  let newRealtor;
                  if (existingRealtor) {
                    // Update existing realtor
                    const { data: updatedRealtor, error: updateError } = await supabaseApi.supabase
                      .from('realtors')
                      .update({
                        team_id: teamId || null,
                        level: 1, // Чирак
                      })
                      .eq('id', existingRealtor.id)
                      .select()
                      .single();

                    if (updateError) throw updateError;
                    newRealtor = updatedRealtor;
                  } else {
                    // Create new realtor
                    const { data: createdRealtor, error: realtorError } = await supabaseApi.supabase
                      .from('realtors')
                      .insert({
                        user_id: profileId,
                        team_id: teamId || null,
                        level: 1, // Чирак
                      })
                      .select()
                      .single();

                    if (realtorError) throw realtorError;
                    newRealtor = createdRealtor;
                  }

                  // Update trainee email in training_group_trainees
                  await supabaseApi.supabase
                    .from('training_group_trainees')
                    .update({ email: accountData.email.trim() })
                    .eq('id', traineeForAccountCreation.id);

                  // Update local state
                  const updatedGroups = groups.map(g =>
                    g.id === selectedGroupForDetails?.id
                      ? {
                          ...g,
                          trainees: g.trainees.map(t =>
                            t.id === traineeForAccountCreation.id
                              ? { ...t, introCompleted: true, email: accountData.email.trim() }
                              : t
                          ),
                        }
                      : g
                  );
                  onUpdateGroups?.(updatedGroups);
                  
                  setSelectedGroupForDetails((prev) =>
                    prev
                      ? {
                          ...prev,
                          trainees: prev.trainees.map(t =>
                            t.id === traineeForAccountCreation.id
                              ? { ...t, introCompleted: true, email: accountData.email.trim() }
                              : t
                          ),
                        }
                      : null
                  );

                  toast({
                    title: 'Акаунт създаден успешно',
                    description: `${traineeForAccountCreation.name} е маркиран като завършил встъпително обучение и акаунтът е създаден.`,
                  });

                  // Close dialog and reset
                  setIsCreateAccountDialogOpen(false);
                  setTraineeForAccountCreation(null);
                  setAccountData({ email: '', password: '', confirmPassword: '' });

                  // Navigate to trainee's training page
                  navigate(`/training-progress?userId=${profileId}`);
                } catch (error) {
                  console.error('Error creating account:', error);
                  toast({
                    title: 'Грешка',
                    description: error instanceof Error ? error.message : 'Неуспешно създаване на акаунт.',
                    variant: 'destructive',
                  });
                }
              }} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="account-email">Имейл *</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                    placeholder="ivan@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-password">Парола *</Label>
                  <Input
                    id="account-password"
                    type="password"
                    value={accountData.password}
                    onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                    placeholder="Минимум 6 символа"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-confirm-password">Потвърди парола *</Label>
                  <Input
                    id="account-confirm-password"
                    type="password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    placeholder="Потвърди паролата"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsCreateAccountDialogOpen(false);
                      setTraineeForAccountCreation(null);
                      setAccountData({ email: '', password: '', confirmPassword: '' });
                    }}
                  >
                    Отказ
                  </Button>
                  <Button type="submit" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Създай акаунт
                  </Button>
                </div>
              </form>
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
