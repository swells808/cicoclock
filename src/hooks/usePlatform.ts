import { useState, useEffect } from 'react';

interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    // Check for ?mobile=true URL parameter for dev testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    if (forceMobile) {
      return {
        isNative: true,
        isIOS: false,
        isAndroid: true, // Simulate Android for testing
        isWeb: false,
        platform: 'android',
      };
    }
    
    return {
      isNative: false,
      isIOS: false,
      isAndroid: false,
      isWeb: true,
      platform: 'web',
    };
  });

  useEffect(() => {
    // Skip Capacitor detection if mobile preview mode is active
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mobile') === 'true') {
      return;
    }

    const detectPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
        
        setPlatformInfo({
          isNative,
          isIOS: platform === 'ios',
          isAndroid: platform === 'android',
          isWeb: platform === 'web',
          platform,
        });
      } catch {
        // Capacitor not available, default to web
        setPlatformInfo({
          isNative: false,
          isIOS: false,
          isAndroid: false,
          isWeb: true,
          platform: 'web',
        });
      }
    };

    detectPlatform();
  }, []);

  return platformInfo;
};

// Static check for SSR/initial render - synchronous version
export const getPlatformSync = (): PlatformInfo => {
  try {
    // Check if we're in a Capacitor environment via user agent or global
    const isCapacitor = typeof window !== 'undefined' && 
      (window as any).Capacitor?.isNativePlatform?.();
    
    if (isCapacitor) {
      const platform = (window as any).Capacitor?.getPlatform?.() || 'web';
      return {
        isNative: true,
        isIOS: platform === 'ios',
        isAndroid: platform === 'android',
        isWeb: false,
        platform,
      };
    }
  } catch {
    // Ignore errors
  }
  
  return {
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  };
};
