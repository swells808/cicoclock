import React from 'react';
import { useCompany } from '@/contexts/CompanyContext';

interface MobileHeaderProps {
  title?: string;
  currentTime?: Date;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title,
  currentTime 
}) => {
  const { company } = useCompany();

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
          {currentTime && (
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">
                {formatTime(currentTime)}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
