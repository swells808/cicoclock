import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, Menu, LayoutDashboard, Clock, CheckSquare, User } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface MobileHeaderProps {
  title?: string;
  currentTime?: Date;
}

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Time Clock', url: '/timeclock', icon: Clock },
  { title: 'Task Check-in', url: '/task-checkin', icon: CheckSquare },
  { title: 'Profile', url: '/profile', icon: User },
];

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title,
  currentTime 
}) => {
  const { company } = useCompany();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-primary text-primary-foreground safe-area-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      {company?.company_logo_url && (
                        <img 
                          src={company.company_logo_url} 
                          alt={company.company_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{company?.company_name || 'CICO'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 p-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                          isActive(item.url)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </nav>
                  
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {company?.company_logo_url && (
              <img 
                src={company.company_logo_url} 
                alt={company.company_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-semibold text-lg">
                {title || company?.company_name || 'CICO'}
              </h1>
              {currentTime && (
                <p className="text-xs opacity-80">{formatDate(currentTime)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentTime && (
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {formatTime(currentTime)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
