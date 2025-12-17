import React from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserAvatarDropdownProps {
  user: {
    email?: string;
    raw_user_meta_data?: {
      full_name?: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatarDropdown: React.FC<UserAvatarDropdownProps> = ({
  user,
  size = 'md',
  className = ''
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfile = () => {
    navigate('/settings');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`outline-none ${className}`}>
          <UserAvatar user={user} size={size} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-background border shadow-lg z-50"
        align="end"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-foreground">
            {user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.display_name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
