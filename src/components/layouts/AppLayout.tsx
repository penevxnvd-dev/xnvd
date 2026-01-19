import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { TopologySidebar } from '@/components/TopologySidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { hasPermission } from '@/utils/permissions';
import { api } from '@/lib/api';
import { transformOffices } from '@/utils/dataTransform';
import { Office } from '@/types';
import { Menu, Settings, Users, LogOut, ChevronDown } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarMode?: 'admin' | 'realtor' | 'team-leader';
  customNavbarContent?: React.ReactNode;
  onSidebarToggle?: () => void; // Optional custom sidebar toggle for pages with custom sidebars
}

export const AppLayout = ({ 
  children, 
  showSidebar = true,
  sidebarMode = 'admin',
  customNavbarContent,
  onSidebarToggle
}: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false;
  });
  const [topologyOffices, setTopologyOffices] = useState<Office[]>([]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { user } = await api.getCurrentUser();
        if (user) {
          setUserInfo({
            fullName: user.full_name || user.email,
            email: user.email,
            role: role || 'Потребител'
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, [role]);

  useEffect(() => {
    if (showSidebar) {
      const fetchTopology = async () => {
        try {
          const dbOffices = await api.getAllOfficesFull();
          const transformedOffices = transformOffices(dbOffices);
          setTopologyOffices(transformedOffices);
        } catch (error) {
          console.error('Error fetching topology:', error);
        }
      };
      fetchTopology();
    }
  }, [showSidebar]);

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-1">
      {/* Sidebar with spacer - Push style */}
      {showSidebar && (
        <TopologySidebar
          offices={topologyOffices}
          onOfficeClick={() => {}}
          onLeaderClick={() => {}}
          onAgentClick={() => {}}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          mode={sidebarMode}
          showQuickActions={true}
          onTrainingCalendarClick={() => navigate('/training-calendar')}
          onTrainingListClick={() => navigate('/training-list')}
          role={role || undefined}
        />
      )}

      {/* Main Content Area - Gets pushed by sidebar spacer */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Navbar */}
        <header className="border-b border-border bg-card/95 backdrop-blur-lg shadow-sm sticky top-0 z-30 w-full">
          <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4">
            <div className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-2 md:gap-3">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                {/* Hamburger Button - Always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (showSidebar) {
                      setSidebarOpen(!sidebarOpen);
                    } else if (onSidebarToggle) {
                      // Use custom toggle for pages with custom sidebars
                      onSidebarToggle();
                    }
                  }}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 relative z-10 hover:bg-accent"
                  aria-label="Toggle sidebar"
                  title={showSidebar ? (sidebarOpen ? "Скрий страничната лента" : "Покажи страничната лента") : (onSidebarToggle ? "Превключи страничната лента" : "Меню")}
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </Button>
                {/* Logo */}
                <button 
                  onClick={handleHome} 
                  className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
                >
                  <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
                </button>
                {/* Custom Navbar Content */}
                {customNavbarContent}
              </div>
              <div className="flex gap-2">
                <NotificationCenter />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-[10px] sm:text-xs border border-primary/30">
                          {userInfo?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </div>
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
                    {hasPermission(role, 'manage.users') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                          <Users className="h-4 w-4 mr-2" />
                          Управление на акаунти
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

        {/* Page Content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>

      {/* Account Settings Dialog */}
      {userInfo && (
        <AccountSettingsDialog
          open={accountSettingsOpen}
          onOpenChange={setAccountSettingsOpen}
          userInfo={userInfo}
          onUpdate={() => {
            // Refresh user info
            const fetchUserInfo = async () => {
              try {
                const { user } = await api.getCurrentUser();
                if (user) {
                  setUserInfo({
                    fullName: user.full_name || user.email,
                    email: user.email,
                    role: role || 'Потребител'
                  });
                }
              } catch (error) {
                console.error('Error fetching user info:', error);
              }
            };
            fetchUserInfo();
          }}
        />
      )}
    </div>
  );
};
