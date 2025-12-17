import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
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

export const UserAvatar = React.forwardRef<
  React.ElementRef<typeof Avatar>,
  UserAvatarProps
>(({ user, size = 'md', className = '' }, ref) => {
  const getInitials = () => {
    const fullName = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.display_name;

    if (fullName) {
      return fullName
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }

    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return 'U';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  };

  return (
    <Avatar ref={ref} className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage
        src={user.raw_user_meta_data?.avatar_url}
        alt={user.raw_user_meta_data?.full_name || user.email || 'User'}
      />
      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = "UserAvatar";
