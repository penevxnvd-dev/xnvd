import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, useUserRole } from '@/hooks/useUserRole';
import { hasPermission, getViewableResources, getCreatableResources, getEditableResources, getDeletableResources } from '@/utils/permissions';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { TopologySidebar } from '@/components/TopologySidebar';
import { Settings, Download, LogOut, Menu, ChevronDown, Calendar, CheckCircle2 } from 'lucide-react';
import { exportKPIData, exportDeals, exportDiagnoses } from '@/lib/export';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';
import { transformOffices } from '@/utils/dataTransform';
import { Office as UIOffice } from '@/types';
import { cn } from '@/lib/utils';

interface UnifiedDashboardProps {
  userId: string;
  role: UserRole;
  children?: ReactNode;
  customHeader?: ReactNode;
  customBreadcrumb?: string[];
  showTopologySidebar?: boolean;
  onHome?: () => void;
}

export const UnifiedDashboard = ({
  userId,
  role,
  children,
  customHeader,
  customBreadcrumb = ['Начало'],
  showTopologySidebar = false,
  onHome,
}: UnifiedDashboardProps) => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<{ fullName: string; email: string; role: string } | null>(null);
  const [topologyOffices, setTopologyOffices] = useState<UIOffice[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [kpiMetrics, setKpiMetrics] = useState<any>(null);

  const fetchUserInfo = useCallback(async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        const roleNames: Record<UserRole, string> = {
          admin: 'Администратор',
          realtor: 'Реализатор',
          team_leader: 'Лидер на екип',
          office_manager: 'Мениджър на офис',
          regional_manager: 'Регионален мениджър',
          null: 'Неизвестна',
        };
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: roleNames[role] || 'Неизвестна',
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, [role]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  useEffect(() => {
    if (showTopologySidebar) {
      const fetchTopology = async () => {
        try {
          const offices = await api.getAllOfficesFull();
          const transformed = transformOffices(offices);
          setTopologyOffices(transformed);
        } catch (error) {
          console.error('Error fetching topology:', error);
        }
      };
      fetchTopology();
    }
  }, [showTopologySidebar]);

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      navigate('/dashboard');
    }
  };

  const canExport = hasPermission(role, 'export.data');
  const canManageUsers = hasPermission(role, 'manage.users');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Topology Sidebar */}
      {showTopologySidebar && (
        <TopologySidebar
          offices={topologyOffices}
          onOfficeClick={() => {}}
          onLeaderClick={() => {}}
          onAgentClick={() => {}}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          mode={role === 'admin' ? 'admin' : role === 'regional_manager' ? 'admin' : 'office-manager'}
          showQuickActions={true}
          onTrainingCalendarClick={hasPermission(role, 'view.training') ? () => navigate('/training-calendar') : undefined}
          onTrainingListClick={hasPermission(role, 'view.training') ? () => navigate('/training-list') : undefined}
          role={role}
          teamName={customHeader ? undefined : (userInfo?.role || 'Дашборд')}
          breadcrumb={customBreadcrumb.join(' / ')}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
          <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                {showTopologySidebar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleHome();
                  }}
                  className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
                  type="button"
                >
                  <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
                </button>
              </div>
              <div className="flex gap-2">
                <NotificationCenter />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo?.email || 'user'}`}
                          />
                          <AvatarFallback className="text-[10px] sm:text-xs">
                            {userInfo?.fullName?.split(' ').map((n) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline">{userInfo?.fullName || 'Акаунт'}</span>
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userInfo?.fullName || 'Потребител'}</p>
                        <p className="text-xs text-muted-foreground">{userInfo?.email || ''}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Роля: {userInfo?.role || 'Неизвестна'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Настройки на акаунта
                    </DropdownMenuItem>
                    {canManageUsers && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                          <Settings className="h-4 w-4 mr-2" />
                          Управление на потребители
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Изход
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
          {children}
        </main>
      </div>

      {/* Account Settings Dialog */}
      {userInfo && (
        <AccountSettingsDialog
          open={accountSettingsOpen}
          onOpenChange={setAccountSettingsOpen}
          userInfo={userInfo}
          onUpdate={fetchUserInfo}
        />
      )}
    </div>
  );
};

// Permission-based wrapper components
export const PermissionGate = ({
  permission,
  role,
  children,
  fallback = null,
}: {
  permission: string;
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  if (hasPermission(role, permission as any)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};

export const ResourceView = ({
  resource,
  role,
  children,
  fallback = null,
}: {
  resource: string;
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const viewable = getViewableResources(role);
  if (viewable.includes(resource)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};

export const ResourceActions = ({
  resource,
  role,
  onCreate,
  onEdit,
  onDelete,
  children,
}: {
  resource: string;
  role: UserRole;
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
}) => {
  const creatable = getCreatableResources(role);
  const editable = getEditableResources(role);
  const deletable = getDeletableResources(role);

  return (
    <div className="flex gap-2">
      {creatable.includes(resource) && onCreate && (
        <Button onClick={onCreate} size="sm" variant="default">
          <span>Създай {resource}</span>
        </Button>
      )}
      {editable.includes(resource) && onEdit && (
        <Button onClick={onEdit} size="sm" variant="outline">
          <span>Редактирай</span>
        </Button>
      )}
      {deletable.includes(resource) && onDelete && (
        <Button onClick={onDelete} size="sm" variant="destructive">
          <span>Изтрий</span>
        </Button>
      )}
      {children}
    </div>
  );
};

