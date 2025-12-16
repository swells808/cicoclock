import React from 'react';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomNav } from './components/MobileBottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentTime?: Date;
  showBottomNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  currentTime,
  showBottomNav = true,
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title={title} currentTime={currentTime} />
      <main className={cn(
        "flex-1 overflow-auto",
        showBottomNav && "pb-20" // Space for bottom nav
      )}>
        {children}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
};

// Helper for className merging
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');
