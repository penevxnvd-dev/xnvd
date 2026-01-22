import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Users, 
  User,
  Globe,
  ChevronDown,
  ChevronUp,
  Menu,
  Crown,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Download,
  Plus,
  Sparkles,
  Search,
  X,
  Home,
  GraduationCap,
  BarChart3,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Office, TeamLeader, Agent } from '@/types';
import { api } from '@/lib/api';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TopologySidebarProps {
  offices: Office[];
  onOfficeClick?: (office: Office) => void;
  onLeaderClick?: (leader: TeamLeader) => void;
  onAgentClick?: (agent: Agent) => void;
  onChatClick?: (userId: string, userName: string) => void;
  selectedOfficeId?: string;
  selectedLeaderId?: string;
  selectedAgentId?: string;
  isOpen: boolean;
  onToggle: () => void;
  mode?: 'admin' | 'realtor';
  showQuickActions?: boolean;
  onTrainingCalendarClick?: () => void;
  onTrainingListClick?: () => void;
  onExportClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
  onAddClick?: () => void;
  showAddButton?: boolean;
  onAddPersonClick?: () => void;
  showAddPersonButton?: boolean;
  role?: string;
  teamName?: string;
  breadcrumb?: string;
}

interface CountryData {
  id: string;
  name: string;
  cities: CityData[];
}

interface CityData {
  id: string;
  name: string;
  offices: Office[];
}

export const TopologySidebar = ({
  offices,
  onOfficeClick,
  onLeaderClick,
  onAgentClick,
  onChatClick,
  selectedOfficeId,
  selectedLeaderId,
  selectedAgentId,
  isOpen,
  onToggle,
  mode = 'admin',
  showQuickActions = true,
  onTrainingCalendarClick,
  onTrainingListClick,
  onExportClick,
  onBackClick,
  showBackButton = false,
  onAddClick,
  showAddButton = false,
  onAddPersonClick,
  showAddPersonButton = false,
  role,
  teamName,
  breadcrumb,
}: TopologySidebarProps) => {
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set());
  const [topology, setTopology] = useState<CountryData[]>([]);
  const [teamsData, setTeamsData] = useState<Map<string, Array<{id: string; name: string; leaderName: string; members: Agent[]}>>>(new Map());
  const [currentTeam, setCurrentTeam] = useState<{
    leader: { id: string; name: string; level: string } | null;
    members: Array<{ id: string; name: string; level: string }>;
    teamName: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar is always open, no navigation effects needed

  useEffect(() => {
    if (mode !== 'realtor') return;
    
    const fetchCurrentRealtorTeam = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        console.log('🔍 Loading team data from Supabase:', supabaseUrl);
        
        console.log('📥 Fetching current realtor from Prisma (via API)...');
        const realtor = await api.getCurrentRealtor();
        if (!realtor) {
          console.log('❌ No realtor profile found');
          setCurrentTeam(null);
          return;
        }

        const teamId = realtor.team_id;
        console.log('✅ Current realtor found. TeamId:', teamId);
        
        console.log('📥 Fetching all offices with teams from Prisma (via API)...');
        const offices = await api.getAllOfficesFull();
        console.log(`✅ Loaded ${offices.length} offices from Prisma`);
        let foundTeam = null;
        let foundOffice = null;
        
        if (teamId) {
          for (const office of offices) {
            for (const team of office.teams || []) {
              if (team.id === teamId) {
                foundTeam = team;
                foundOffice = office;
                break;
              }
            }
            if (foundTeam) break;
          }
        }
        
        if (!foundTeam) {
          console.log('⚠️ Team not found by teamId, trying to find Краси Кътев team as fallback');
          for (const office of offices) {
            for (const team of office.teams || []) {
              if (team.leader && team.leader.full_name) {
                const leaderName = team.leader.full_name.toLowerCase();
                if (leaderName.includes('краси') || leaderName.includes('кътев')) {
                  foundTeam = team;
                  foundOffice = office;
                  console.log('✅ Found Краси Кътев team as fallback:', team.name);
                  break;
                }
              }
            }
            if (foundTeam) break;
          }
        }
        
        if (foundTeam && foundOffice) {
          try {
            console.log(`📥 Fetching full team data from Prisma (via API) for office: ${foundOffice.id}`);
            const fullOffice = await api.getOfficeFull(foundOffice.id);
            const fullTeam = fullOffice.teams?.find((t: { id: string }) => t.id === foundTeam.id);
            if (fullTeam) {
              foundTeam = fullTeam;
              console.log(`✅ Loaded full team data from Prisma. Realtors: ${foundTeam.realtors?.length || 0}`);
            }
          } catch (error) {
            console.error('❌ Error fetching full team data from Prisma:', error);
          }
        }
        
        if (foundTeam && (!foundTeam.realtors || foundTeam.realtors.length === 0)) {
          try {
            console.log(`📥 Fetching realtors directly from Prisma (via API) for team: ${foundTeam.id}`);
            const realtors = await api.getRealtorsByTeam(foundTeam.id);
            if (realtors && realtors.length > 0) {
              foundTeam.realtors = realtors;
              console.log(`✅ Loaded ${realtors.length} realtors from Prisma`);
            }
          } catch (error) {
            console.error('❌ Error fetching realtors by team from Prisma:', error);
          }
        }
        
        if (foundTeam) {
          const leader = foundTeam.leader ? {
            id: foundTeam.leader.id,
            name: formatNameWithEmoji(foundTeam.leader.full_name),
            level: foundTeam.leader.realtor?.level ? 
              (foundTeam.leader.realtor.level === 1 ? 'Чирак' : 
               foundTeam.leader.realtor.level === 3 ? 'Реализатор' : 
               foundTeam.leader.realtor.level === 5 ? 'Елит' : `Ниво ${foundTeam.leader.realtor.level}`) : 'Чирак',
            userId: foundTeam.leader.id
          } : null;

          const allRealtors = (foundTeam.realtors || []).map((r: { id: string; user_id?: string; level?: number; profile?: { full_name?: string; id?: string } }) => {
            const profile = r.profile || {};
            return {
              id: r.id,
              name: formatNameWithEmoji(profile.full_name || 'Неизвестен'),
              level: r.level ? 
                (r.level === 1 ? 'Чирак' : 
                 r.level === 3 ? 'Реализатор' : 
                 r.level === 5 ? 'Елит' : `Ниво ${r.level}`) : 'Чирак',
              userId: r.user_id || profile.id
            };
          });

          const members = allRealtors.filter((r: { userId?: string }) => {
            const realtorUserId = r.userId;
            const leaderId = foundTeam.leader?.id;
            return realtorUserId !== leaderId;
          });

          console.log('✅ Team loaded successfully:', {
            name: foundTeam.name,
            leader: leader?.name,
            members: members.length,
            source: 'PRISMA (via API)'
          });
          setCurrentTeam({
            leader,
            members,
            teamName: foundTeam.name
          });
        } else {
          console.log('❌ Team not found for current realtor and fallback also failed');
          setCurrentTeam(null);
        }
      } catch (error) {
        console.error('❌ Error fetching current realtor team from Prisma:', error);
        setCurrentTeam(null);
      }
    };

    fetchCurrentRealtorTeam();
  }, [mode]);

  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        const dbOffices = await api.getAllOfficesFull();
        const teamsMap = new Map<string, Array<{id: string; name: string; leaderName: string; members: Agent[]}>>();
        
        dbOffices.forEach((dbOffice: { teams?: Array<{ id: string; leader?: { full_name?: string }; realtors?: Array<{ id?: string; level?: number; hire_date?: string; profile?: { full_name?: string; email?: string; id?: string } }> }> }) => {
          const officeTeams: Array<{id: string; name: string; leaderName: string; members: Agent[]}> = [];
          
          (dbOffice.teams || []).forEach((team: { id: string; leader?: { full_name?: string }; realtors?: Array<{ id?: string; level?: number; hire_date?: string; profile?: { full_name?: string; email?: string; id?: string } }> }) => {
            const leaderName = formatNameWithoutElevenEleven(team.leader?.full_name || 'Без лидер').displayName;
            const members = (team.realtors || []).map((realtor: { id?: string; level?: number; hire_date?: string; profile?: { full_name?: string; email?: string; id?: string } }) => {
              const profile = realtor.profile;
              return {
                id: realtor.id || profile?.id || `realtor-${Date.now()}`,
                name: formatNameWithEmoji(profile?.full_name || 'Неизвестен'),
                phone: '',
                position: '',
                email: profile?.email || '',
                level: realtor.level ? (realtor.level === 1 ? 'Чирак' : realtor.level === 3 ? 'Реализатор' : realtor.level === 5 ? 'Елит' : `Ниво ${realtor.level}`) : 'Чирак' as 'Чирак' | 'Реализатор' | 'Елит',
                trainingStage: 1 as const,
                dateOfHiring: realtor.hire_date || new Date().toISOString().split('T')[0],
                department: '',
                skills: [],
                deals: realtor.deals || [],
                levelHistory: []
              } as Agent;
            });
            
            officeTeams.push({
              id: team.id,
              name: team.name,
              leaderName,
              members
            });
          });
          
          if (officeTeams.length > 0) {
            teamsMap.set(dbOffice.id, officeTeams);
          }
        });
        
        setTeamsData(teamsMap);
        console.log('Teams data loaded:', teamsMap);
      } catch (error) {
        console.error('Error fetching teams data:', error);
      }
    };
    
    if (offices.length > 0) {
      fetchTeamsData();
    }
  }, [offices]);

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const dbOffices = await api.getAllOfficesFull();
        const countryMap = new Map<string, CountryData>();

        dbOffices.forEach((dbOffice: { city?: { country?: { id?: string; name?: string }; id?: string; name?: string } }) => {
          const city = dbOffice.city;
          const country = city?.country;
          
          if (!country || !city) {
            const countryName = dbOffice.address?.split(', ').pop() || 'Неизвестна';
            const cityName = dbOffice.address?.split(', ')[0] || dbOffice.name || 'Неизвестен';
            
            if (!countryMap.has(countryName)) {
              countryMap.set(countryName, {
                id: countryName,
                name: countryName,
                cities: [],
              });
            }

            const countryData = countryMap.get(countryName)!;
            let cityData = countryData.cities.find((c) => c.name === cityName);

            if (!cityData) {
              cityData = {
                id: `${countryName}-${cityName}`,
                name: cityName,
                offices: [],
              };
              countryData.cities.push(cityData);
            }

            const matchingOffice = offices.find((o) => o.id === dbOffice.id);
            if (matchingOffice) {
              cityData.offices.push(matchingOffice);
            }
          } else {
            const countryName = country.name;
            const cityName = city.name;

            if (!countryMap.has(countryName)) {
              countryMap.set(countryName, {
                id: country.id || countryName,
                name: countryName,
                cities: [],
              });
            }

            const countryData = countryMap.get(countryName)!;
            let cityData = countryData.cities.find((c) => c.id === city.id);

            if (!cityData) {
              cityData = {
                id: city.id,
                name: cityName,
                offices: [],
              };
              countryData.cities.push(cityData);
            }

            const matchingOffice = offices.find((o) => o.id === dbOffice.id);
            if (matchingOffice) {
              cityData.offices.push(matchingOffice);
            }
          }
        });

            setTopology(Array.from(countryMap.values()));
      } catch (error) {
        console.error('Error fetching topology:', error);
        const countryMap = new Map<string, CountryData>();
        offices.forEach((office) => {
          const countryName = office.location.split(', ').pop() || 'Неизвестна';
          const cityName = office.location.split(', ')[0] || 'Неизвестен';

          if (!countryMap.has(countryName)) {
            countryMap.set(countryName, {
              id: countryName,
              name: countryName,
              cities: [],
            });
          }

          const country = countryMap.get(countryName)!;
          let city = country.cities.find((c) => c.name === cityName);

          if (!city) {
            city = {
              id: `${countryName}-${cityName}`,
              name: cityName,
              offices: [],
            };
            country.cities.push(city);
          }

          city.offices.push(office);
        });
        setTopology(Array.from(countryMap.values()));
      }
    };

    fetchTopology();
    
    if (selectedOfficeId) {
      const office = offices.find((o) => o.id === selectedOfficeId);
      if (office) {
        const countryName = office.location.split(', ').pop() || '';
        const cityName = office.location.split(', ')[0] || '';
        setExpandedCountries((prev) => new Set(prev).add(countryName));
        setExpandedCities((prev) => new Set(prev).add(`${countryName}-${cityName}`));
        setExpandedOffices((prev) => new Set(prev).add(selectedOfficeId));
      }
    }
    if (selectedLeaderId) {
      const leader = offices
        .flatMap((o) => o.teamLeaders)
        .find((l) => l.id === selectedLeaderId);
      if (leader) {
        const office = offices.find((o) => o.teamLeaders.some((l) => l.id === selectedLeaderId));
        if (office) {
          const countryName = office.location.split(', ').pop() || '';
          const cityName = office.location.split(', ')[0] || '';
          setExpandedCountries((prev) => new Set(prev).add(countryName));
          setExpandedCities((prev) => new Set(prev).add(`${countryName}-${cityName}`));
          setExpandedOffices((prev) => new Set(prev).add(office.id));
          setExpandedLeaders((prev) => new Set(prev).add(selectedLeaderId));
        }
      }
    }
  }, [offices, selectedOfficeId, selectedLeaderId]);

  const toggleCountry = (countryId: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const toggleCity = (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  const toggleOffice = (officeId: string) => {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (next.has(officeId)) {
        next.delete(officeId);
      } else {
        next.add(officeId);
      }
      return next;
    });
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const toggleLeader = (leaderId: string) => {
    setExpandedLeaders((prev) => {
      const next = new Set(prev);
      if (next.has(leaderId)) {
        next.delete(leaderId);
      } else {
        next.add(leaderId);
      }
      return next;
    });
  };

  const filteredTopology = topology.map(country => ({
    ...country,
    cities: country.cities.map(city => ({
      ...city,
      offices: city.offices.filter(office => 
        !searchQuery || 
        office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(city => city.offices.length > 0)
  })).filter(country => country.cities.length > 0);

  return (
    <>
      {/* Modern Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-gradient-to-b from-card via-card to-muted/5 border-r border-border/50 shadow-xl z-40 transition-transform duration-300 overflow-hidden backdrop-blur-sm w-72 sm:w-80",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Modern Header */}
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Навигация</h2>
                {teamName && (
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{teamName}</p>
                )}
              </div>
            </div>
            
            {/* Search Bar */}
            {(mode === 'admin' && topology.length > 0) && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Търсене..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs bg-background/50 border-border/50 focus:border-primary/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Section */}
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Навигация
            </h3>
            <div className="space-y-1.5">
              {/* Dashboard Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => {
                        navigate('/dashboard');
                      }}
                      variant={location.pathname === '/dashboard' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "w-full h-9 text-xs justify-start gap-2 transition-all",
                        location.pathname === '/dashboard'
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          : "hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span className="truncate">Начало</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Начална страница</TooltipContent>
                </Tooltip>
              </TooltipProvider>

            </div>
          </div>

          {/* Page Navigation Links */}
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Страници
            </h3>
            <div className="space-y-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => navigate('/analytics')}
                      variant={location.pathname === '/analytics' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "w-full h-9 text-xs justify-start gap-2 transition-all",
                        location.pathname === '/analytics'
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          : "hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="truncate">Калсация</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Калсация и статистики</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => navigate('/interviews')}
                      variant={location.pathname === '/interviews' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "w-full h-9 text-xs justify-start gap-2 transition-all",
                        location.pathname === '/interviews'
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          : "hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="truncate">Интервюта</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Календар за интервюта</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Quick Actions Section */}
          {showQuickActions && (
            <div className="p-3 border-b border-border/50 bg-muted/20">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" />
                Обучение
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {onTrainingCalendarClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            if (onTrainingCalendarClick) {
                              onTrainingCalendarClick();
                            } else {
                              navigate('/training-calendar');
                            }
                          }}
                          variant={location.pathname.includes('/training-calendar') ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "h-9 text-xs justify-start gap-2 transition-all",
                            location.pathname.includes('/training-calendar')
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                              : "hover:bg-primary/10 hover:border-primary/50"
                          )}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="truncate">Календар</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Календар на обученията</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onTrainingListClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            if (onTrainingListClick) {
                              onTrainingListClick();
                            } else {
                              navigate('/training-list');
                            }
                          }}
                          variant={location.pathname.includes('/training-list') ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "h-9 text-xs justify-start gap-2 transition-all",
                            location.pathname.includes('/training-list')
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                              : "hover:bg-primary/10 hover:border-primary/50"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="truncate">Обучение</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Списък с курсисти</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onExportClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            if (onExportClick) {
                              onExportClick();
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs justify-start gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all col-span-2"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="truncate">Експорт данни</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Експортиране на данни</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {showAddButton && onAddClick && (
                  <Button
                    onClick={onAddClick}
                    size="sm"
                    className="h-9 text-xs gap-2 col-span-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Добави</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {/* Team Section - Modern Design */}
              {currentTeam ? (
                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="px-2 py-2 mb-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Мой екип
                    </h3>
                  </div>
                  
                  {/* Team Leader Card */}
                  {currentTeam.leader && (
                    <div 
                      className={cn(
                        "group relative px-3 py-2.5 mb-2 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 cursor-pointer transition-all duration-200 hover:shadow-md",
                        onChatClick && "hover:bg-primary/15"
                      )}
                      onClick={() => onChatClick && onChatClick(currentTeam.leader!.id, currentTeam.leader!.name)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-yellow-400/30">
                            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          </div>
                          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{currentTeam.leader.name}</div>
                          <div className="text-xs text-muted-foreground">Ръководител</div>
                        </div>
                        {onChatClick && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChatClick(currentTeam.leader!.id, currentTeam.leader!.name);
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Team Members */}
                  {currentTeam.members.length > 0 && (
                    <div className="space-y-1.5">
                      {currentTeam.members.map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            "group relative px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer",
                            onChatClick ? "hover:bg-accent/50 border border-transparent hover:border-accent" : "hover:bg-accent/30"
                          )}
                          onClick={() => onChatClick && onChatClick((member as { userId?: string; id: string }).userId || member.id, member.name)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                                {member.level}
                              </Badge>
                            </div>
                            {onChatClick && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChatClick((member as { userId?: string; id: string }).userId || member.id, member.name);
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : mode === 'realtor' ? (
                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="px-2 py-2 mb-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Екип</h3>
                    <p className="text-xs text-muted-foreground">Зареждане...</p>
                  </div>
                </div>
              ) : null}

              {/* Topology Tree - Modern Design */}
              {mode === 'admin' && filteredTopology.length > 0 && (
                <div className="space-y-1">
                  {filteredTopology.map((country) => (
                    <div key={country.id} className="space-y-1">
                      {/* Country */}
                      <button
                        onClick={() => toggleCountry(country.id)}
                        className={cn(
                          "group w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                          expandedCountries.has(country.id) 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                          </div>
                          <span className="truncate">{country.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {country.cities.length}
                          </Badge>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          expandedCountries.has(country.id) ? "rotate-180" : ""
                        )} />
                      </button>

                      {/* Cities */}
                      {expandedCountries.has(country.id) && (
                        <div className="ml-4 space-y-1 border-l-2 border-border/30 pl-2">
                          {country.cities.map((city) => (
                            <div key={city.id} className="space-y-1">
                              <button
                                onClick={() => toggleCity(city.id)}
                                className={cn(
                                  "group w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-200",
                                  expandedCities.has(city.id) 
                                    ? "bg-accent/50 text-foreground font-medium" 
                                    : "hover:bg-accent/30 text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{city.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1">
                                    {city.offices.length}
                                  </Badge>
                                </div>
                                <ChevronDown className={cn(
                                  "h-3 w-3 transition-transform duration-200",
                                  expandedCities.has(city.id) ? "rotate-180" : ""
                                )} />
                              </button>

                              {/* Offices */}
                              {expandedCities.has(city.id) && (
                                <div className="ml-3 space-y-1 border-l-2 border-border/20 pl-2">
                                  {city.offices.map((office) => (
                                    <div key={office.id} className="space-y-1">
                                      <button
                                        onClick={() => {
                                          toggleOffice(office.id);
                                          onOfficeClick?.(office);
                                        }}
                                        className={cn(
                                          "group w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all duration-200",
                                          expandedOffices.has(office.id) && "bg-accent/30",
                                          selectedOfficeId === office.id 
                                            ? "bg-primary/15 text-primary font-semibold border border-primary/30" 
                                            : "hover:bg-accent/20 text-foreground"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                          <span className="truncate">{office.name}</span>
                                          <Badge variant="outline" className="text-[10px] px-1">
                                            {teamsData.get(office.id)?.length || 0}
                                          </Badge>
                                        </div>
                                        <ChevronDown className={cn(
                                          "h-3 w-3 transition-transform duration-200",
                                          expandedOffices.has(office.id) ? "rotate-180" : ""
                                        )} />
                                      </button>

                                      {/* Teams */}
                                      {expandedOffices.has(office.id) && (
                                        <div className="ml-3 space-y-1 border-l-2 border-border/10 pl-2">
                                          {teamsData.get(office.id)?.map((team) => (
                                            <div key={team.id} className="space-y-1">
                                              <button
                                                onClick={() => toggleTeam(team.id)}
                                                className={cn(
                                                  "group w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-all duration-200",
                                                  expandedTeams.has(team.id) 
                                                    ? "bg-accent/20 text-foreground" 
                                                    : "hover:bg-accent/10 text-muted-foreground"
                                                )}
                                              >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                  <span className="truncate">{team.name}</span>
                                                  <Badge variant="outline" className="text-[10px] px-1">
                                                    {team.members.length}
                                                  </Badge>
                                                </div>
                                                <ChevronDown className={cn(
                                                  "h-2.5 w-2.5 transition-transform duration-200",
                                                  expandedTeams.has(team.id) ? "rotate-180" : ""
                                                )} />
                                              </button>

                                              {/* Team Members */}
                                              {expandedTeams.has(team.id) && (
                                                <div className="ml-3 space-y-0.5">
                                                  {team.members.length > 0 ? (
                                                    team.members.map((member) => (
                                                      <button
                                                        key={member.id}
                                                        onClick={() => onAgentClick?.(member)}
                                                        className={cn(
                                                          "group w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-200",
                                                          selectedAgentId === member.id 
                                                            ? "bg-primary/10 text-primary font-medium" 
                                                            : "hover:bg-accent/10 text-muted-foreground"
                                                        )}
                                                      >
                                                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                        <span className="truncate flex-1 text-left">{member.name}</span>
                                                        <Badge variant="secondary" className="text-[10px] px-1">
                                                          {member.level}
                                                        </Badge>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="text-[10px] text-muted-foreground px-2 py-1">
                                                      Няма членове
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )) || (
                                            <div className="text-[10px] text-muted-foreground px-2 py-1">
                                              Няма екипи
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Spacer for main content - pushes content when sidebar is open */}
      {isOpen && <div className="w-72 sm:w-80 flex-shrink-0" />}
    </>
  );
};
