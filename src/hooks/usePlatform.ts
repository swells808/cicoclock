import { useState, useEffect } from 'react';

interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

// Detect if running in a mobile browser
const detectMobileBrowser = (): { isMobile: boolean; isIOS: boolean; isAndroid: boolean } => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isMobile: false, isIOS: false, isAndroid: false };
  }
  
  const userAgent = navigator.userAgent || navigator.vendor || '';
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/i.test(userAgent);
  
  return { isMobile, isIOS, isAndroid };
};

export const usePlatform = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    // Check for ?mobile=true URL parameter for dev testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    if (forceMobile) {
      return {
        isNative: true,
        isIOS: false,
        isAndroid: true,
        isWeb: false,
        platform: 'android',
      };
    }
    
    // Use synchronous detection for initial render
    return getPlatformSync();
  });

  useEffect(() => {
    // Skip detection if mobile preview mode is active
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mobile') === 'true') {
      return;
    }

    // Detect platform based on mobile browser
    const { isMobile, isIOS, isAndroid } = detectMobileBrowser();
    
    if (isMobile) {
      const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
      setPlatformInfo({
        isNative: true, // Treat mobile browsers as "native" for UI purposes
        isIOS,
        isAndroid,
        isWeb: false,
        platform: platform as 'ios' | 'android' | 'web',
      });
    } else {
      setPlatformInfo({
        isNative: false,
        isIOS: false,
        isAndroid: false,
        isWeb: true,
        platform: 'web',
      });
    }
  }, []);

  return platformInfo;
};

// Static check for SSR/initial render - synchronous version
export const getPlatformSync = (): PlatformInfo => {
  try {
    // Check for mobile browser
    const { isMobile, isIOS, isAndroid } = detectMobileBrowser();
    if (isMobile) {
      const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
      return {
        isNative: true, // Treat mobile browsers as "native" for UI purposes
        isIOS,
        isAndroid,
        isWeb: false,
        platform: platform as 'ios' | 'android' | 'web',
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
