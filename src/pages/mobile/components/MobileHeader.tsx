import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface MobileHeaderProps {
  title?: string;
  currentTime?: Date;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title,
  currentTime 
}) => {
  const { company } = useCompany();
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-primary text-primary-foreground safe-area-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
