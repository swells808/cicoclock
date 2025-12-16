import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';

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

const CREDENTIAL_SERVER = 'cico-app-credentials';

export const useBiometrics = (): UseBiometricsReturn => {
  const { isNative } = usePlatform();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<'face' | 'fingerprint' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!isNative) {
        setIsLoading(false);
        return;
      }

      try {
        const { NativeBiometric, BiometryType } = await import('capacitor-native-biometric');
        const result = await NativeBiometric.isAvailable();
        
        setIsAvailable(result.isAvailable);
        
        if (result.biometryType === BiometryType.FACE_ID || 
            result.biometryType === BiometryType.FACE_AUTHENTICATION) {
          setBiometryType('face');
        } else if (result.biometryType === BiometryType.TOUCH_ID || 
                   result.biometryType === BiometryType.FINGERPRINT) {
          setBiometryType('fingerprint');
        }

        // Check if credentials exist
        try {
          const credentials = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
          setHasStoredCredentials(!!credentials?.username && !!credentials?.password);
        } catch {
          setHasStoredCredentials(false);
        }
      } catch (error) {
        console.log('Biometric check failed:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [isNative]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isNative || !isAvailable) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to access your account',
        title: 'Login with Biometrics',
        subtitle: biometryType === 'face' ? 'Use Face ID to login' : 'Use fingerprint to login',
        description: 'Quick and secure access to your account',
      });
      
      return true;
    } catch (error) {
      console.log('Biometric authentication failed:', error);
      return false;
    }
  }, [isNative, isAvailable, biometryType]);

  const saveCredentials = useCallback(async (credentials: BiometricCredentials): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.setCredentials({
        username: credentials.username,
        password: credentials.password,
        server: CREDENTIAL_SERVER,
      });
      
      setHasStoredCredentials(true);
      return true;
    } catch (error) {
      console.log('Failed to save credentials:', error);
      return false;
    }
  }, [isNative]);

  const getCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    if (!isNative) return null;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      const credentials = await NativeBiometric.getCredentials({
        server: CREDENTIAL_SERVER,
      });
      
      if (credentials?.username && credentials?.password) {
        return {
          username: credentials.username,
          password: credentials.password,
        };
      }
      return null;
    } catch (error) {
      console.log('Failed to get credentials:', error);
      return null;
    }
  }, [isNative]);

  const deleteCredentials = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.deleteCredentials({
        server: CREDENTIAL_SERVER,
      });
      
      setHasStoredCredentials(false);
      return true;
    } catch (error) {
      console.log('Failed to delete credentials:', error);
      return false;
    }
  }, [isNative]);

  return {
    isAvailable,
    biometryType,
    isLoading,
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    hasStoredCredentials,
  };
};
