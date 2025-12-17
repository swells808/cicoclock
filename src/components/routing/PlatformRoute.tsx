import React from 'react';
import { usePlatform } from '@/hooks/usePlatform';

interface PlatformRouteProps {
  web: React.ReactNode;
  mobile: React.ReactNode;
}

export const PlatformRoute = React.forwardRef<HTMLDivElement, PlatformRouteProps>(
  ({ web, mobile }, ref) => {
    const { isNative } = usePlatform();

    return <div ref={ref}>{isNative ? mobile : web}</div>;
  }
);

PlatformRoute.displayName = "PlatformRoute";
