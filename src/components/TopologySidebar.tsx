import { useState, useEffect } from 'react';
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
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Office, TeamLeader, Agent } from '@/types';
import { supabaseApi } from '@/lib/supabaseApi';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

interface TopologySidebarProps {
  offices: Office[];
  onOfficeClick?: (office: Office) => void;
  onLeaderClick?: (leader: TeamLeader) => void;
  onAgentClick?: (agent: Agent) => void;
  selectedOfficeId?: string;
  selectedLeaderId?: string;
  selectedAgentId?: string;
  isOpen: boolean;
  onToggle: () => void;
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
  selectedOfficeId,
  selectedLeaderId,
  selectedAgentId,
  isOpen,
  onToggle,
}: TopologySidebarProps) => {
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set());
  const [topology, setTopology] = useState<CountryData[]>([]);
  const [teamsData, setTeamsData] = useState<Map<string, Array<{id: string; name: string; leaderName: string; members: Agent[]}>>>(new Map());

  useEffect(() => {
    // Fetch teams data for all offices
    const fetchTeamsData = async () => {
      try {
        const dbOffices = await supabaseApi.getAllOfficesFull();
        const teamsMap = new Map<string, Array<{id: string; name: string; leaderName: string; members: Agent[]}>>();
        
        dbOffices.forEach((dbOffice: any) => {
          const officeTeams: Array<{id: string; name: string; leaderName: string; members: Agent[]}> = [];
          
          (dbOffice.teams || []).forEach((team: any) => {
            const leaderName = formatNameWithoutElevenEleven(team.leader?.full_name || 'Без лидер').displayName;
            const members = (team.realtors || []).map((realtor: any) => {
              const profile = realtor.profile;
              return {
                id: realtor.id || profile?.id || `realtor-${Date.now()}`,
                name: formatNameWithEmoji(profile?.full_name || 'Неизвестен'),
                phone: '',
                position: '',
                email: profile?.email || '',
                level: realtor.level ? (realtor.level === 1 ? 'Чирак' : realtor.level === 3 ? 'Реализатор' : realtor.level === 5 ? 'Елит' : `Ниво ${realtor.level}`) : 'Чирак' as any,
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
    // Fetch full office data with city and country info
    const fetchTopology = async () => {
      try {
        const dbOffices = await supabaseApi.getAllOfficesFull();
        const countryMap = new Map<string, CountryData>();

        dbOffices.forEach((dbOffice: any) => {
          const city = dbOffice.city;
          const country = city?.country;
          
          if (!country || !city) {
            // Fallback to location string parsing
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

            // Find matching office from transformed offices
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

            // Find matching office from transformed offices
            const matchingOffice = offices.find((o) => o.id === dbOffice.id);
            if (matchingOffice) {
              cityData.offices.push(matchingOffice);
            }
          }
        });

            setTopology(Array.from(countryMap.values()));
      } catch (error) {
        console.error('Error fetching topology:', error);
        // Fallback to simple organization by location string
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
    
    // Auto-expand selected items
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

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-card border-r border-border shadow-lg z-40 transition-all duration-300 overflow-hidden",
          isOpen ? "w-64" : "w-0 -translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-border">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Топология
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Бърза навигация
            </p>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
              {topology.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Няма данни
                </div>
              ) : (
                topology.map((country) => (
                  <div key={country.id} className="space-y-1">
                    {/* Country */}
                    <button
                      onClick={() => toggleCountry(country.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent",
                        expandedCountries.has(country.id) && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{country.name}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          ({country.cities.length})
                        </span>
                      </div>
                      {expandedCountries.has(country.id) ? (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                    </button>

                    {/* Cities */}
                    {expandedCountries.has(country.id) && (
                      <div className="ml-4 space-y-1">
                        {country.cities.map((city) => (
                          <div key={city.id} className="space-y-1">
                            <button
                              onClick={() => toggleCity(city.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors hover:bg-accent/50",
                                expandedCities.has(city.id) && "bg-accent/50"
                              )}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{city.name}</span>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  ({city.offices.length})
                                </span>
                              </div>
                              {expandedCities.has(city.id) ? (
                                <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-2.5 w-2.5 flex-shrink-0" />
                              )}
                            </button>

                            {/* Offices */}
                            {expandedCities.has(city.id) && (
                              <div className="ml-4 space-y-1">
                                {city.offices.map((office) => (
                                  <div key={office.id} className="space-y-1">
                                    <button
                                      onClick={() => {
                                        toggleOffice(office.id);
                                        onOfficeClick?.(office);
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors hover:bg-accent/50",
                                        expandedOffices.has(office.id) && "bg-accent/50",
                                        selectedOfficeId === office.id && "bg-primary/10 text-primary font-medium"
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Building2 className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{office.name}</span>
                                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                          ({teamsData.get(office.id)?.length || 0})
                                        </span>
                                      </div>
                                      {expandedOffices.has(office.id) ? (
                                        <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-2.5 w-2.5 flex-shrink-0" />
                                      )}
                                    </button>

                                    {/* Teams */}
                                    {expandedOffices.has(office.id) && (
                                      <div className="ml-4 space-y-1">
                                        {teamsData.get(office.id)?.map((team) => (
                                          <div key={team.id} className="space-y-1">
                                            <button
                                              onClick={() => toggleTeam(team.id)}
                                              className={cn(
                                                "w-full flex items-center justify-between px-2 py-0.5 rounded-md text-[11px] transition-colors hover:bg-accent/50",
                                                expandedTeams.has(team.id) && "bg-accent/50"
                                              )}
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <Users className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                                                <span className="truncate">{team.name}</span>
                                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                                  ({team.members.length})
                                                </span>
                                              </div>
                                              {expandedTeams.has(team.id) ? (
                                                <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="h-2.5 w-2.5 flex-shrink-0" />
                                              )}
                                            </button>

                                            {/* Team Members */}
                                            {expandedTeams.has(team.id) && (
                                              <div className="ml-4 space-y-1">
                                                {team.members.length > 0 ? (
                                                  team.members.map((member) => (
                                                    <button
                                                      key={member.id}
                                                      onClick={() => onAgentClick?.(member)}
                                                      className={cn(
                                                        "w-full flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] transition-colors hover:bg-accent/50",
                                                        selectedAgentId === member.id && "bg-primary/10 text-primary font-medium"
                                                      )}
                                                    >
                                                      <User className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                                                      <span className="truncate flex-1">{member.name}</span>
                                                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                                        {member.level}
                                                      </span>
                                                    </button>
                                                  ))
                                                ) : (
                                                  <div className="text-[10px] text-muted-foreground px-2 py-1">
                                                    Няма хора в екипа
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
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Spacer for main content */}
      {isOpen && <div className="w-64" />}
    </>
  );
};

