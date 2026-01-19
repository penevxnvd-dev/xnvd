import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Filter, Download, LayoutGrid, Calendar, Calendar as CalendarIcon, LayoutList, PlayCircle, Clock, CheckCircle2, Users, Printer } from 'lucide-react';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { TrainingGroup } from '@/types';
import { TrainingGroupDetail } from '@/components/TrainingGroupDetail';
import { useUserRole } from '@/hooks/useUserRole';
import { api } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, nextMonday, nextDay, addDays, parse } from 'date-fns';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { cn } from '@/lib/utils';

const TrainingCalendarPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useUserRole();
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>([]);
  const [loadingTrainingGroups, setLoadingTrainingGroups] = useState(true);
  const [selectedTrainingGroup, setSelectedTrainingGroup] = useState<TrainingGroup | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
  const [traineesAndRecruits, setTraineesAndRecruits] = useState<Array<{
    id: string;
    name: string;
    email: string;
    type: 'trainee' | 'recruit';
    level?: number;
    teamId: string | null;
    createdAt: string;
  }>>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(true);
  const selectedCityId = searchParams.get('cityId');
  const [userEmail, setUserEmail] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');

  // Fetch current user ID and name
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { user } = await supabaseApi.getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          // Get full name from profile
          const { data: profile } = await supabaseApi.supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profile?.full_name) {
            setCurrentUserName(profile.full_name);
          } else {
            // Fallback to email if no profile name
            setCurrentUserName(user.email?.split('@')[0] || undefined);
          }
          
          if (user.email) {
            setUserEmail(user.email);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch training groups from database
  useEffect(() => {
    const fetchTrainingGroups = async () => {
      setLoadingTrainingGroups(true);
      try {
        const groups = await api.getAllTrainingGroups();
        // Transform to match TrainingGroup interface
        const transformedGroups: TrainingGroup[] = groups.map((g) => ({
          id: g.id,
          startDate: g.startDate,
          leader: g.leader,
          leaderId: g.leaderId,
          trainees: g.trainees.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            email: t.email,
            position: t.position,
            level: t.level,
            trainingStage: t.trainingStage,
            selectedDate: '',
            introCompleted: t.introCompleted || false,
          })),
          currentDay: g.currentDay,
          status: g.status,
          createdBy: g.createdBy || null,
        }));
        setTrainingGroups(transformedGroups);
      } catch (error) {
        console.error('Error fetching training groups:', error);
        setTrainingGroups([]);
      } finally {
        setLoadingTrainingGroups(false);
      }
    };

    fetchTrainingGroups();
  }, []);

  // Fetch all trainees and recruits from database
  useEffect(() => {
    const fetchTraineesAndRecruits = async () => {
      setLoadingTrainees(true);
      try {
        const data = await supabaseApi.getAllTraineesAndRecruits();
        setTraineesAndRecruits(data);
      } catch (error) {
        console.error('Error fetching trainees and recruits:', error);
        setTraineesAndRecruits([]);
      } finally {
        setLoadingTrainees(false);
      }
    };

    fetchTraineesAndRecruits();
  }, []);

  const handleUpdateTrainingGroups = async (updatedGroups: TrainingGroup[]) => {
    // Update local state immediately for better UX
    setTrainingGroups(updatedGroups);
    
    // Refresh from database to ensure consistency after a short delay
    setTimeout(async () => {
      try {
        const groups = await api.getAllTrainingGroups();
        const transformedGroups: TrainingGroup[] = groups.map((g) => ({
          id: g.id,
          startDate: g.startDate,
          leader: g.leader,
          leaderId: g.leaderId,
          trainees: g.trainees.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            email: t.email,
            position: t.position,
            level: t.level,
            trainingStage: t.trainingStage,
            selectedDate: '',
            introCompleted: t.introCompleted || false,
          })),
          currentDay: g.currentDay,
          status: g.status,
          createdBy: g.createdBy || null,
        }));
        setTrainingGroups(transformedGroups);
      } catch (error) {
        console.error('Error refreshing training groups:', error);
      }
    }, 500);
  };

  const handleTrainingGroupClick = (group: TrainingGroup) => {
    setSelectedTrainingGroup(group);
    setTrainingDialogOpen(true);
  };

  
  // Calculate statistics
  const activeGroups = useMemo(() => trainingGroups.filter(g => g.status === 'активна'), [trainingGroups]);
  const completedGroups = useMemo(() => trainingGroups.filter(g => g.status === 'завършена'), [trainingGroups]);
  
  const getNextMonday = () => {
    const today = new Date();
    const next = nextMonday(today);
    return format(next, 'dd.MM.yyyy');
  };

  const getNextThursday = () => {
    const today = new Date();
    let next = nextDay(today, 4); // 4 = Thursday
    if (next < nextMonday(today)) {
      next = addDays(next, 7);
    }
    return format(next, 'dd.MM.yyyy');
  };

  const upcomingGroups = useMemo(() => {
    const registeredTrainees = traineesAndRecruits.filter(t => t.type === 'trainee' && !trainingGroups.some(g => g.trainees.some(tr => tr.email === t.email)));
    return [
      {
        id: 'upcoming-monday',
        date: getNextMonday(),
        day: 'Понеделник',
        trainees: registeredTrainees.filter(t => {
          // Check if trainee has selected monday (we need to track this somehow)
          return true; // Simplified for now
        })
      },
      {
        id: 'upcoming-thursday',
        date: getNextThursday(),
        day: 'Четвъртък',
        trainees: registeredTrainees.filter(t => {
          // Check if trainee has selected thursday
          return true; // Simplified for now
        })
      }
    ];
  }, [traineesAndRecruits, trainingGroups]);
  
  const totalTrainees = useMemo(() => {
    return trainingGroups.reduce((sum, g) => sum + g.trainees.length, 0) + traineesAndRecruits.length;
  }, [trainingGroups, traineesAndRecruits]);
  
  const getUserInitials = () => {
    if (currentUserName) {
      return currentUserName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return 'U';
  };

  const customNavbarContent = (
    <>
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">Календар на обученията</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">График на новите групи</p>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
        {/* Statistics - Modern Compact Design */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {loadingTrainees ? (
                  // Loading skeleton for statistics
                  Array.from({ length: role === 'admin' ? 4 : 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 animate-pulse">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-6" />
                    </div>
                  ))
                ) : (
                  <>
                    {/* Активни групи */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all duration-200 cursor-pointer">
                            <div className="p-0.5 rounded-full bg-green-500/20 dark:bg-green-400/20 group-hover:bg-green-500/30 dark:group-hover:bg-green-400/30 transition-colors">
                              <PlayCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-sm font-bold text-green-700 dark:text-green-300">{activeGroups.length}</span>
                            <span className="text-[10px] font-medium text-green-600/80 dark:text-green-400/80 hidden lg:inline">Активни</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Активни групи: {activeGroups.length}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Предстоящи групи */}
                    {(role === 'admin' || role === 'regional_manager' || role === 'office_manager' || role === 'team_leader') && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all duration-200 cursor-pointer">
                              <div className="p-0.5 rounded-full bg-blue-500/20 dark:bg-blue-400/20 group-hover:bg-blue-500/30 dark:group-hover:bg-blue-400/30 transition-colors">
                                <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                              </div>
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                {upcomingGroups.reduce((sum, g) => sum + g.trainees.length, 0) > 0 ? upcomingGroups.length : 0}
                              </span>
                              <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 hidden lg:inline">Предстоящи</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Предстоящи групи: {upcomingGroups.reduce((sum, g) => sum + g.trainees.length, 0) > 0 ? upcomingGroups.length : 0}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Завършени групи */}
                    {(role === 'admin' || role === 'regional_manager' || role === 'office_manager' || role === 'team_leader') && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/30 dark:to-gray-900/20 border border-gray-200/60 dark:border-gray-800/40 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 cursor-pointer">
                              <div className="p-0.5 rounded-full bg-gray-500/20 dark:bg-gray-400/20 group-hover:bg-gray-500/30 dark:group-hover:bg-gray-400/30 transition-colors">
                                <CheckCircle2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
                              </div>
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{completedGroups.length}</span>
                              <span className="text-[10px] font-medium text-gray-600/80 dark:text-gray-400/80 hidden lg:inline">Завършени</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Завършени групи: {completedGroups.length}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Общо курсисти */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-sm transition-all duration-200 cursor-pointer">
                            <div className="p-0.5 rounded-full bg-primary/20 dark:bg-primary/30 group-hover:bg-primary/30 dark:group-hover:bg-primary/40 transition-colors">
                              <Users className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-sm font-bold text-primary">
                              {totalTrainees}
                            </span>
                            <span className="text-[10px] font-medium text-primary/70 dark:text-primary/60 hidden lg:inline">Общо</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Общо курсисти: {totalTrainees}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
              
              {/* Divider */}
              <div className="h-8 w-px bg-border/60 mx-1 hidden md:block" />
              
              {/* Modern Toolbar with filters, search, and view options */}
              <div className="flex items-center gap-1.5">
                  {/* Modern Search */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="transition-all duration-200 hover:scale-105 hover:shadow-md border-primary/20 hover:border-primary/40"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Търсене</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                                <CommandItem key={t.id}>
                                  <Users className="h-4 w-4 mr-2" />
                                  {formatNameWithEmoji(t.name)} - {t.phone}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Modern Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-all duration-200 hover:scale-105 hover:shadow-md relative border-border/60 hover:border-primary/40 hover:bg-accent/50",
                                filterStatus !== 'all' && "border-primary/40 bg-primary/5"
                              )}
                            >
                              <Filter className="h-4 w-4" />
                              {filterStatus !== 'all' && (
                                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold">
                                  {filterStatus === 'active' ? 'А' : 
                                   filterStatus === 'upcoming' ? 'П' : 
                                   filterStatus === 'completed' ? 'З' : ''}
                                </Badge>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Филтър</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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

                  {/* Modern View Mode */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 transition-all duration-200 hover:scale-105 hover:shadow-md border-border/60 hover:border-primary/40 hover:bg-accent/50"
                            >
                              {viewMode === 'month' && <LayoutGrid className="h-4 w-4" />}
                              {viewMode === 'week' && <Calendar className="h-4 w-4" />}
                              {viewMode === 'day' && <CalendarIcon className="h-4 w-4" />}
                              {viewMode === 'list' && <LayoutList className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Изглед</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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

                  {/* Modern Export */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 transition-all duration-200 hover:scale-105 hover:shadow-md border-border/60 hover:border-primary/40 hover:bg-accent/50"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Експорт</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Експорт</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        const csv = [
                          ['Дата', 'Инструктор', 'Статус', 'Курсисти', 'Ден'].join(','),
                          ...trainingGroups.map(g => [
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
    </>
  );

  return (
    <AppLayout customNavbarContent={customNavbarContent}>
      <div className="container mx-auto px-4 py-8">
        {loadingTrainingGroups ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Зареждане на групи...</p>
            </div>
          </div>
        ) : (
        <TrainingCalendar 
          groups={trainingGroups} 
          onGroupClick={handleTrainingGroupClick}
            onUpdateGroups={handleUpdateTrainingGroups}
            canEdit={role !== 'realtor' && role !== null}
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName}
            currentUserRole={role || undefined}
            selectedCityId={selectedCityId || null}
            traineesAndRecruits={traineesAndRecruits}
            loadingTrainees={loadingTrainees}
            viewMode={viewMode}
            filterStatus={filterStatus}
            searchQuery={searchQuery}
        />
        )}
      </div>

      <TrainingGroupDetail 
        group={selectedTrainingGroup} 
        open={trainingDialogOpen} 
        onOpenChange={setTrainingDialogOpen} 
      />
    </AppLayout>
  );
};

export default TrainingCalendarPage;

