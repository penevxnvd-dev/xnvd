import { useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { hasPermission } from "@/utils/permissions";
import { useHierarchy } from "@/hooks/useHierarchy";
import {
  Building2,
  ChevronDown,
  Home,
  MapPin,
  Users,
  BarChart3,
  Briefcase,
  GraduationCap,
  Calendar,
  ListChecks,
  UserCog,
} from "lucide-react";

import type { CityNode, OfficeNode, TeamNode } from "@/hooks/useHierarchy";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export function HierarchySidebar({ isOpen, onToggle }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, userId, loading: roleLoading } = useUserRole();

  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());

  // Зареди кеширани permissions ако са налични
  const cachedPermissions = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('userRole');
      if (!cached) return null;
      const data = JSON.parse(cached);
      return data.permissions || null;
    } catch {
      return null;
    }
  }, []);

  // Използвай кеширани permissions докато се зарежда ролята
  const canViewHierarchy = useMemo(
    () => {
      if (cachedPermissions && roleLoading) {
        return cachedPermissions.canViewHierarchy;
      }
      return !!role &&
        (hasPermission(role, "view.cities") ||
          hasPermission(role, "view.offices") ||
          hasPermission(role, "view.teams"));
    },
    [role, roleLoading, cachedPermissions]
  );

  const canViewTraining = useMemo(
    () => {
      if (cachedPermissions && roleLoading) {
        return cachedPermissions.canViewTraining;
      }
      return !!role && hasPermission(role, "view.training");
    },
    [role, roleLoading, cachedPermissions]
  );

  const canManageUsers = useMemo(
    () => {
      if (cachedPermissions && roleLoading) {
        return cachedPermissions.canManageUsers;
      }
      return !!role && hasPermission(role, "manage.users");
    },
    [role, roleLoading, cachedPermissions]
  );

  // Memoize isActive check
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Memoize navigation handler to prevent unnecessary re-renders and page refresh
  const handleNavigate = useCallback(
    (path: string) => {
      // Ако вече сме на същата страница, не прави нищо
      if (location.pathname === path) {
        return;
      }
      // Използвай navigate с preventScrollReset за да не презарежда страницата
      navigate(path, { preventScrollReset: true });
    },
    [navigate, location.pathname]
  );

  // Use React Query hook for hierarchy data
  const { data: hierarchyData, isLoading: loadingTree } = useHierarchy(userId, role);

  const citiesTree = hierarchyData?.citiesTree || [];
  const officesTree = hierarchyData?.officesTree || [];

  // Memoize toggle functions to prevent unnecessary re-renders
  const toggleCity = useCallback((id: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleOffice = useCallback((id: string) => {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const renderCityTree = useCallback(() => (
    <div className="space-y-1">
      {citiesTree.map((city) => (
        <div key={city.id} className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => toggleCity(city.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-sm font-medium">{city.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {city.offices.length}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform text-muted-foreground",
                expandedCities.has(city.id) && "rotate-180"
              )}
            />
          </button>

          {expandedCities.has(city.id) && (
            <div className="ml-3 pl-2 border-l border-border space-y-1">
              {city.offices.map((office) => (
                <div key={office.id} className="space-y-1">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                    onClick={() => toggleOffice(office.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-xs">{office.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {office.teams.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform text-muted-foreground",
                        expandedOffices.has(office.id) && "rotate-180"
                      )}
                    />
                  </button>

                  {expandedOffices.has(office.id) && (
                    <div className="ml-3 pl-2 border-l border-border/60 space-y-1">
                      {office.teams.map((team) => (
                        <button
                          type="button"
                          key={team.id}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent text-xs transition-colors"
                          onClick={() => handleNavigate("/dashboard")}
                        >
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{team.name}</span>
                        </button>
                      ))}
                      {office.teams.length === 0 && (
                        <div className="text-[10px] text-muted-foreground px-2 py-1">
                          Няма екипи
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {city.offices.length === 0 && (
                <div className="text-[10px] text-muted-foreground px-2 py-1">
                  Няма офиси
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  ), [citiesTree, expandedCities, expandedOffices, toggleCity, toggleOffice, handleNavigate]);

  const renderOfficeTree = useCallback(() => (
    <div className="space-y-1">
      {officesTree.map((office) => (
        <div key={office.id} className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => toggleOffice(office.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-sm font-medium">{office.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {office.teams.length}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform text-muted-foreground",
                expandedOffices.has(office.id) && "rotate-180"
              )}
            />
          </button>

          {expandedOffices.has(office.id) && (
            <div className="ml-3 pl-2 border-l border-border space-y-1">
              {office.teams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent text-xs transition-colors"
                  onClick={() => handleNavigate("/dashboard")}
                >
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{team.name}</span>
                </button>
              ))}
              {office.teams.length === 0 && (
                <div className="text-[10px] text-muted-foreground px-2 py-1">
                  Няма екипи
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  ), [officesTree, expandedOffices, toggleOffice, handleNavigate]);

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-72 sm:w-80 bg-card border-r border-border z-40 transition-transform duration-300",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-border">
            <div className="text-sm font-semibold">Навигация</div>

            {/* Admin (top) - Always visible, static */}
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Админ
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManageUsers}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive("/account-management") && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleNavigate("/account-management")}
              >
                <UserCog className="h-4 w-4" />
                Управление на акаунти
              </Button>
            </div>

            {/* Search removed by request */}

            {/* Main - Always visible, static */}
            <div className="mt-3 space-y-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Основни
              </div>
              <Button
                type="button"
                variant={isActive("/dashboard") ? "default" : "outline"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate("/dashboard")}
              >
                <Home className="h-4 w-4" />
                Начало
              </Button>

              <Button
                type="button"
                variant={isActive("/analytics") ? "default" : "outline"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate("/analytics")}
              >
                <BarChart3 className="h-4 w-4" />
                Калсация
              </Button>

              <Button
                type="button"
                variant={isActive("/interviews") ? "default" : "outline"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate("/interviews")}
              >
                <Briefcase className="h-4 w-4" />
                Интервюта
              </Button>
            </div>

            {/* Training - Always visible, static */}
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Обучение
              </div>

              <Button
                type="button"
                variant={isActive("/training-calendar") ? "default" : "outline"}
                size="sm"
                disabled={!canViewTraining}
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate("/training-calendar")}
              >
                <Calendar className="h-4 w-4" />
                Календар
              </Button>

              <Button
                type="button"
                variant={isActive("/training-list") ? "default" : "outline"}
                size="sm"
                disabled={!canViewTraining}
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate("/training-list")}
              >
                <GraduationCap className="h-4 w-4" />
                Списък
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {!canViewHierarchy ? (
                <div className="text-xs text-muted-foreground p-2">
                  Няма права за преглед на йерархията.
                </div>
              ) : loadingTree ? (
                <div className="text-xs text-muted-foreground p-2">
                  Зареждане...
                </div>
              ) : role === "regional_manager" ? (
                citiesTree.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Няма данни.
                  </div>
                ) : (
                  renderCityTree()
                )
              ) : role === "office_manager" || role === "team_leader" || role === "realtor" ? (
                officesTree.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Няма данни.
                  </div>
                ) : (
                  renderOfficeTree()
                )
              ) : role === "admin" ? (
                citiesTree.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Няма данни.
                  </div>
                ) : (
                  renderCityTree()
                )
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {isOpen && <div className="w-72 sm:w-80 flex-shrink-0" />}
    </>
  );
}
