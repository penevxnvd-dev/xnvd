import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { HierarchySidebar } from '@/components/layouts/HierarchySidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { hasPermission } from '@/utils/permissions';
import { supabaseApi } from '@/lib/supabaseApi';
import { Menu, Settings, Users, LogOut, ChevronDown } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

interface AppLayoutProps {
  children: React.ReactNode;
  customNavbarContent?: React.ReactNode;
}

export const AppLayout = ({ 
  children, 
  customNavbarContent
}: AppLayoutProps) => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const { user } = await supabaseApi.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: role || 'Потребител',
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, [role]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleLogout = async () => {
    await supabaseApi.logout();
    navigate('/auth');
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-1">
      {/* Hierarchy Sidebar - Always shown for authenticated users */}
      <HierarchySidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Navbar */}
        <header className={cn(
          "border-b border-border bg-card/95 backdrop-blur-lg shadow-sm sticky top-0 z-30 w-full",
          customNavbarContent && "py-2 sm:py-3"
        )}>
          <div className="container mx-auto px-2 sm:px-3 md:px-4">
            <div className={cn(
              "flex items-start justify-between flex-wrap gap-1.5 sm:gap-2 md:gap-3",
              customNavbarContent && "flex-col sm:flex-row"
            )}>
              <div className={cn(
                "flex items-start gap-2 sm:gap-4 min-w-0",
                customNavbarContent && "flex-col sm:flex-row w-full sm:w-auto"
              )}>
                {/* Hamburger Button - Always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 relative z-10 hover:bg-accent mt-0.5"
                  aria-label="Toggle sidebar"
                  title={sidebarOpen ? "Скрий страничната лента" : "Покажи страничната лента"}
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </Button>
                {/* Logo */}
                <button 
                  onClick={handleHome} 
                  className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 mt-0.5"
                >
                  <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
                </button>
                {/* Custom Navbar Content */}
                {customNavbarContent}
              </div>
              <div className="flex gap-2 flex-shrink-0">
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
                        <DropdownMenuItem onClick={() => navigate('/account-management')}>
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
            fetchUserInfo();
          }}
        />
      )}
    </div>
  );
};
