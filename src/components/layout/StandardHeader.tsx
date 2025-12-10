import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatarDropdown } from "@/components/ui/UserAvatarDropdown";
import { useUserRole } from "@/hooks/useUserRole";

interface StandardHeaderProps {
  className?: string;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const getLinkClassName = (path: string) => {
    return isActive(path)
      ? "text-primary font-medium"
      : "text-muted-foreground hover:text-primary";
  };

  return (
    <header className={`fixed w-full bg-background border-b border-border shadow-sm z-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex space-x-8">
            <Link to="/dashboard" className={getLinkClassName("/dashboard")}>
              Dashboard
            </Link>
            <Link to="/timeclock" className={getLinkClassName("/timeclock")}>
              Clock
            </Link>
            {isAdmin && (
              <Link to="/time-tracking/admin" className={getLinkClassName("/time-tracking/admin")}>
                Admin Time
              </Link>
            )}
            <Link to="/projects" className={getLinkClassName("/projects")}>
              Projects
            </Link>
            <Link to="/clients" className={getLinkClassName("/clients")}>
              Clients
            </Link>
            <Link to="/reports" className={getLinkClassName("/reports")}>
              Reports
            </Link>
            <Link to="/users" className={getLinkClassName("/users")}>
              Users
            </Link>
            {isAdmin && (
              <Link to="/task-qr-codes" className={getLinkClassName("/task-qr-codes")}>
                QR Codes
              </Link>
            )}
          </nav>
          <div className="flex items-center">
            <UserAvatarDropdown user={user} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
};
