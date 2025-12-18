interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

// Always return web platform - no mobile-specific UI
export const usePlatform = (): PlatformInfo => {
  return {
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  };
};

// Static check - always returns web
export const getPlatformSync = (): PlatformInfo => {
  return {
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  };
};
