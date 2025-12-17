import React from 'react';
import { usePlatform } from '@/hooks/usePlatform';

interface PlatformRouteProps {
  web: React.ReactNode;
  mobile: React.ReactNode;
}

export const PlatformRoute: React.FC<PlatformRouteProps> = ({ web, mobile }) => {
  const { isNative } = usePlatform();

  return <>{isNative ? mobile : web}</>;
};
