# CICO Mobile App - Implementation Notes

## Expo Project Setup

### Initial Setup

```bash
# Create new Expo project
npx create-expo-app@latest CICOMobile --template blank-typescript
cd CICOMobile

# Install core dependencies
npx expo install @supabase/supabase-js
npx expo install expo-secure-store
npx expo install expo-camera
npx expo install expo-location
npx expo install expo-barcode-scanner
npx expo install expo-image-picker

# Install navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler

# Install additional utilities
npm install date-fns
npm install lucide-react-native react-native-svg

# Install async storage (for non-sensitive data)
npx expo install @react-native-async-storage/async-storage
```

### Project Structure

```
CICOMobile/
├── app/                      # Expo Router screens (if using)
├── src/
│   ├── components/
│   │   ├── ui/              # Design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   ├── clock/           # Clock in/out components
│   │   │   ├── ClockButton.tsx
│   │   │   ├── PhotoCapture.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── auth/            # Authentication components
│   │   │   ├── PinInput.tsx
│   │   │   └── CompanySelector.tsx
│   │   └── scanner/         # QR scanning components
│   │       └── QRScanner.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ClockActionScreen.tsx
│   │   ├── TimeHistoryScreen.tsx
│   │   ├── TaskScannerScreen.tsx
│   │   ├── TimeOffScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useClockStatus.ts
│   │   ├── useTimeEntries.ts
│   │   └── useLocation.ts
│   ├── services/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── auth.ts          # Authentication functions
│   │   ├── clock.ts         # Clock in/out functions
│   │   └── storage.ts       # Photo upload
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── theme.ts
│   │   └── config.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── date.ts
│       └── validation.ts
├── assets/
│   ├── icon.png
│   └── splash.png
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Supabase Client Configuration

### src/services/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://ahtiicqunajyyasuxebj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodGlpY3F1bmFqeXlhc3V4ZWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzA5OTgsImV4cCI6MjA3MDAwNjk5OH0._s6TMn5NdiZCbE5Gy4bf6aFuSW-JJpRyoLg6FxV134A';

// SecureStore adapter for auth token persistence
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.error('SecureStore setItem error');
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.error('SecureStore removeItem error');
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

// Edge function caller helper
export async function callEdgeFunction<T>(
  functionName: string,
  body: object,
  requireAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}
```

---

## Authentication Implementation

### src/services/auth.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { callEdgeFunction, supabase } from './supabase';

const COMPANY_ID_KEY = 'cico_company_id';
const PROFILE_KEY = 'cico_profile';

interface Profile {
  id: string;
  user_id: string | null;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_id: string;
  department_id: string | null;
  avatar_url: string | null;
  employee_id: string | null;
}

interface PinAuthResponse {
  success: boolean;
  user: Profile;
}

// PIN Authentication
export async function authenticateWithPin(
  companyId: string,
  pin: string
): Promise<Profile> {
  const response = await callEdgeFunction<PinAuthResponse>(
    'authenticate-pin',
    { company_id: companyId, pin }
  );

  if (!response.success || !response.user) {
    throw new Error('Invalid PIN');
  }

  // Save profile for future use
  await saveProfile(response.user);
  await saveCompanyId(companyId);

  return response.user;
}

// Email/Password Authentication
export async function authenticateWithEmail(
  email: string,
  password: string
): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  await saveProfile(profile);
  await saveCompanyId(profile.company_id);

  return profile;
}

// Employee Lookup (for badge scan)
export async function lookupEmployee(
  companyId: string,
  identifier: string
): Promise<{ id: string; display_name: string; has_pin: boolean }> {
  const response = await callEdgeFunction<{
    success: boolean;
    employee: { id: string; display_name: string; has_pin: boolean };
  }>('lookup-employee', { company_id: companyId, identifier });

  if (!response.success || !response.employee) {
    throw new Error('Employee not found');
  }

  return response.employee;
}

// Local Storage Helpers
export async function saveCompanyId(companyId: string): Promise<void> {
  await AsyncStorage.setItem(COMPANY_ID_KEY, companyId);
}

export async function getCompanyId(): Promise<string | null> {
  return AsyncStorage.getItem(COMPANY_ID_KEY);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function getProfile(): Promise<Profile | null> {
  const data = await SecureStore.getItemAsync(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearAuth(): Promise<void> {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(PROFILE_KEY);
  // Keep company_id for next login convenience
}
```

---

## Clock In/Out Implementation

### src/services/clock.ts

```typescript
import { callEdgeFunction, supabase } from './supabase';
import { uploadClockPhoto } from './storage';
import { getCurrentLocation } from '../hooks/useLocation';

interface ClockStatus {
  clocked_in: boolean;
  active_entry: {
    id: string;
    start_time: string;
    project_id: string | null;
    is_break: boolean;
  } | null;
}

interface ClockResult {
  success: boolean;
  time_entry: {
    id: string;
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
  };
}

// Check current clock status
export async function checkClockStatus(
  profileId: string,
  companyId: string
): Promise<ClockStatus> {
  return callEdgeFunction<ClockStatus>('check-clock-status', {
    profile_id: profileId,
    company_id: companyId,
  });
}

// Clock In
export async function clockIn(params: {
  profileId: string;
  companyId: string;
  projectId?: string;
  photo?: Blob;
  captureLocation?: boolean;
}): Promise<ClockResult> {
  const { profileId, companyId, projectId, photo, captureLocation } = params;

  // Upload photo if provided
  let photoUrl: string | undefined;
  if (photo) {
    photoUrl = await uploadClockPhoto(profileId, photo, 'clock_in');
  }

  // Get location if enabled
  let latitude: number | undefined;
  let longitude: number | undefined;
  let address: string | undefined;
  
  if (captureLocation) {
    try {
      const location = await getCurrentLocation();
      latitude = location.latitude;
      longitude = location.longitude;
      address = location.address;
    } catch (error) {
      console.warn('Location capture failed:', error);
      // Continue without location
    }
  }

  return callEdgeFunction<ClockResult>('clock-in-out', {
    action: 'clock_in',
    profile_id: profileId,
    company_id: companyId,
    project_id: projectId,
    photo_url: photoUrl,
    latitude,
    longitude,
    address,
  });
}

// Clock Out
export async function clockOut(params: {
  profileId: string;
  companyId: string;
  timeEntryId: string;
  photo?: Blob;
  captureLocation?: boolean;
}): Promise<ClockResult> {
  const { profileId, companyId, timeEntryId, photo, captureLocation } = params;

  // Upload photo if provided
  let photoUrl: string | undefined;
  if (photo) {
    photoUrl = await uploadClockPhoto(profileId, photo, 'clock_out');
  }

  // Get location if enabled
  let latitude: number | undefined;
  let longitude: number | undefined;
  let address: string | undefined;
  
  if (captureLocation) {
    try {
      const location = await getCurrentLocation();
      latitude = location.latitude;
      longitude = location.longitude;
      address = location.address;
    } catch (error) {
      console.warn('Location capture failed:', error);
    }
  }

  return callEdgeFunction<ClockResult>('clock-in-out', {
    action: 'clock_out',
    profile_id: profileId,
    company_id: companyId,
    time_entry_id: timeEntryId,
    photo_url: photoUrl,
    latitude,
    longitude,
    address,
  });
}

// Record Break
export async function recordBreak(
  profileId: string,
  companyId: string
): Promise<ClockResult> {
  return callEdgeFunction<ClockResult>('clock-in-out', {
    action: 'break',
    profile_id: profileId,
    company_id: companyId,
  });
}
```

---

## Photo Capture Implementation

### src/services/storage.ts

**Folder Structure:**
- `{company_id}/` - Root folder per company (multi-tenant isolation)
  - `clock-in/` - Clock-in photos
  - `clock-out/` - Clock-out photos

**File Naming:** `{ISO_timestamp}_{PROFILE_ID}.jpg`

```typescript
import { supabase } from './supabase';

export async function uploadClockPhoto(
  companyId: string,
  profileId: string,
  photoBlob: Blob,
  type: 'clock_in' | 'clock_out'
): Promise<string> {
  // Format timestamp for filename (replace special chars)
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  
  // Action subfolder name
  const actionPath = type === 'clock_in' ? 'clock-in' : 'clock-out';
  
  // Full path: company_id/action/timestamp_profileId.jpg
  const filePath = `${companyId}/${actionPath}/${timestamp}_${profileId.toUpperCase()}.jpg`;

  const { error } = await supabase.storage
    .from('timeclock-photos')
    .upload(filePath, photoBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Photo upload failed:', error);
    throw new Error('Failed to upload photo');
  }

  // Return file path for storage in time_entries table
  // Use signed URLs to display since bucket is private
  return filePath;
}
```

**Usage Example:**
```typescript
// In your clock-in handler:
const filePath = await uploadClockPhoto(
  company.id,           // Company UUID
  profile.id,           // Profile UUID  
  photoBlob,            // Captured photo blob
  'clock_in'            // Action type
);

// Pass filePath to clock-in-out edge function
await supabase.functions.invoke('clock-in-out', {
  body: {
    action: 'clock_in',
    profile_id: profile.id,
    company_id: company.id,
    photo_url: filePath,  // Store the path, not a public URL
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address
  }
});
```

### src/components/clock/PhotoCapture.tsx

```typescript
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Button } from '../ui/Button';

interface PhotoCaptureProps {
  onCapture: (photoBlob: Blob) => void;
  onCancel: () => void;
}

export function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <Button onPress={requestPermission}>Grant Permission</Button>
        <Button variant="ghost" onPress={onCancel}>Cancel</Button>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Convert to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      onCapture(blob);
    } catch (error) {
      console.error('Photo capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.front}
      />
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
});
```

---

## Location Capture Implementation

### src/hooks/useLocation.ts

```typescript
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export function useLocation() {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermission(status === 'granted');
  };

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status === 'granted');
    return status === 'granted';
  };

  return { permission, loading, error, requestPermission };
}

export async function getCurrentLocation(): Promise<LocationData> {
  const { status } = await Location.getForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const { latitude, longitude } = location.coords;

  // Reverse geocode to get address
  let address: string | undefined;
  try {
    const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result) {
      address = [
        result.streetNumber,
        result.street,
        result.city,
        result.region,
        result.postalCode,
      ].filter(Boolean).join(', ');
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
  }

  return { latitude, longitude, address };
}
```

---

## QR Scanner Implementation

### src/components/scanner/QRScanner.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Button } from '../ui/Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

export function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getPermission = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermission();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <Button onPress={onCancel}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
      </View>
      <View style={styles.controls}>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
});
```

---

## Offline Support

### src/services/offlineQueue.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = 'cico_offline_queue';

interface QueuedAction {
  id: string;
  type: 'clock_in' | 'clock_out' | 'break';
  timestamp: string;
  data: any;
}

export async function addToQueue(action: Omit<QueuedAction, 'id'>): Promise<void> {
  const queue = await getQueue();
  const newAction: QueuedAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  queue.push(newAction);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAction[]> {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function processQueue(): Promise<void> {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);
  if (!isConnected) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  const successfulIds: string[] = [];

  for (const action of queue) {
    try {
      // Process each action based on type
      // ... call appropriate API
      successfulIds.push(action.id);
    } catch (error) {
      console.error(`Failed to process queued action ${action.id}:`, error);
    }
  }

  // Remove successful actions from queue
  const remainingQueue = queue.filter(a => !successfulIds.includes(a.id));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
}
```

---

## Security Considerations

### 1. Token Storage
- Use `expo-secure-store` for sensitive data (auth tokens, profile info)
- Use `AsyncStorage` only for non-sensitive data (preferences, company_id)

### 2. PIN Security
- PINs are never stored locally
- PIN validation happens server-side via edge function
- Rate limiting should be implemented on the edge function

### 3. Photo Privacy
- Clock photos are uploaded to a private bucket
- URLs should be signed or accessed via authenticated requests

### 4. Network Security
- All API calls use HTTPS
- Edge functions validate input data
- RLS policies enforce company isolation

---

## Testing Checklist

### Authentication
- [ ] PIN authentication works
- [ ] Invalid PIN shows error
- [ ] Email/password login works
- [ ] Session persists after app restart
- [ ] Logout clears session

### Clock Operations
- [ ] Clock in creates time entry
- [ ] Clock out completes time entry
- [ ] Break recording works
- [ ] Cannot clock in when already clocked in
- [ ] Cannot clock out when not clocked in

### Camera & Location
- [ ] Camera permission request works
- [ ] Photo capture and upload works
- [ ] Location permission request works
- [ ] GPS coordinates captured correctly
- [ ] App handles permission denial gracefully

### Offline
- [ ] App shows offline indicator
- [ ] Clock actions queue when offline
- [ ] Queue processes when online
- [ ] Failed queue items are retried

### UI/UX
- [ ] Dark mode works correctly
- [ ] Text scales with system settings
- [ ] Touch targets are 44px minimum
- [ ] Loading states shown appropriately
- [ ] Error messages are clear

---

## Deployment

### EAS Build Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for development
eas build --profile development --platform all

# Build for production
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### app.json Configuration

```json
{
  "expo": {
    "name": "CICO Mobile",
    "slug": "cico-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#5296ED"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.cicomobile",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "CICO needs camera access to capture clock in/out photos",
        "NSLocationWhenInUseUsageDescription": "CICO needs location access to record where you clock in/out"
      }
    },
    "android": {
      "package": "com.yourcompany.cicomobile",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#5296ED"
      },
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "plugins": [
      "expo-camera",
      "expo-location",
      "expo-barcode-scanner",
      "expo-secure-store"
    ]
  }
}
```

---

## Known Limitations

1. **PIN-only employees**: Cannot access direct Supabase queries (no auth session)
   - Solution: Use edge functions for all data access

2. **Photo uploads**: Large photos may fail on slow connections
   - Solution: Compress images before upload

3. **Background location**: Not implemented (requires additional permissions)
   - Consider for v2 geofencing feature

4. **Biometric auth**: Not yet implemented
   - Planned for v2 using `expo-local-authentication`

---

## Support & Resources

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Lucide Icons](https://lucide.dev/icons)
