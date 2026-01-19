import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

interface GlobalNavbarProps {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
  title?: string;
  children?: React.ReactNode;
}

export const GlobalNavbar = ({ 
  onSidebarToggle, 
  sidebarOpen,
  title,
  children 
}: GlobalNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-lg shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4">
        <div className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-2 md:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSidebarToggle}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo */}
            <button 
              onClick={handleLogoClick} 
              className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
            >
              <img 
                src={logo} 
                alt="Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" 
              />
            </button>

            {/* Title */}
            {title && (
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground truncate">
                {title}
              </h1>
            )}
          </div>

          {/* Right side content */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};
