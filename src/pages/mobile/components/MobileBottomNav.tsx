import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: <Clock className="h-6 w-6" />, label: 'Clock', path: '/timeclock' },
  { icon: <ClipboardCheck className="h-6 w-6" />, label: 'Tasks', path: '/task-checkin?mobile=true' },
  { icon: <LayoutDashboard className="h-6 w-6" />, label: 'Dashboard', path: '/dashboard?mobile=true' },
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
