import { useCallback } from 'react';

interface BiometricCredentials {
  username: string;
  password: string;
}

interface UseBiometricsReturn {
  isAvailable: boolean;
  biometryType: 'face' | 'fingerprint' | 'none';
  isLoading: boolean;
  authenticate: () => Promise<boolean>;
  saveCredentials: (credentials: BiometricCredentials) => Promise<boolean>;
  getCredentials: () => Promise<BiometricCredentials | null>;
  deleteCredentials: () => Promise<boolean>;
  hasStoredCredentials: boolean;
}

// Stub implementation - biometrics are not available without Capacitor
export const useBiometrics = (): UseBiometricsReturn => {
  const authenticate = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  const saveCredentials = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  const getCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    return null;
  }, []);

  const deleteCredentials = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  return {
    isAvailable: false,
    biometryType: 'none',
    isLoading: false,
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    hasStoredCredentials: false,
  };
};
