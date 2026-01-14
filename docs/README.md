# CICO Mobile App Documentation

Complete documentation package for building a native iOS/Android mobile app using Expo that integrates with the CICO Supabase backend.

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [**CICO_MOBILE_PRD.md**](./CICO_MOBILE_PRD.md) | Product Requirements Document - features, user flows, screen specs |
| [**SUPABASE_INTEGRATION.md**](./SUPABASE_INTEGRATION.md) | Complete API reference for all edge functions and database access |
| [**DATABASE_SCHEMA.md**](./DATABASE_SCHEMA.md) | Database tables, columns, enums, relationships, and RLS patterns |
| [**DESIGN_SYSTEM.md**](./DESIGN_SYSTEM.md) | Colors, typography, spacing, component specifications |
| [**IMPLEMENTATION_NOTES.md**](./IMPLEMENTATION_NOTES.md) | Expo setup, code examples, security notes, deployment guide |

---

## 🚀 Quick Start

### 1. Create Expo Project

```bash
npx create-expo-app@latest CICOMobile --template blank-typescript
cd CICOMobile
```

### 2. Install Dependencies

```bash
# Supabase
npx expo install @supabase/supabase-js expo-secure-store

# Camera & Location
npx expo install expo-camera expo-location expo-barcode-scanner expo-image-picker

# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler

# Utilities
npm install date-fns lucide-react-native react-native-svg
npx expo install @react-native-async-storage/async-storage
```

### 3. Configure Supabase Client

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://ahtiicqunajyyasuxebj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 4. Implement PIN Authentication

```typescript
// Most employees use PIN-only auth (no Supabase Auth account)
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/authenticate-pin`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      company_id: 'company-uuid',
      pin: '123456',
    }),
  }
);

const { user } = await response.json();
// user.id is the profile_id - use this for all subsequent API calls
```

### 5. Implement Clock In/Out

```typescript
// Clock In
await fetch(`${SUPABASE_URL}/functions/v1/clock-in-out`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({
    action: 'clock_in',
    profile_id: user.id,
    company_id: user.company_id,
    photo_url: uploadedPhotoUrl,      // Optional
    latitude: location.latitude,       // Optional
    longitude: location.longitude,     // Optional
  }),
});

// Clock Out
await fetch(`${SUPABASE_URL}/functions/v1/clock-in-out`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({
    action: 'clock_out',
    profile_id: user.id,
    company_id: user.company_id,
    time_entry_id: activeEntry.id,    // Required for clock out
  }),
});
```

---

## 🔑 Key Concepts

### Authentication Types

| Type | Use Case | Returns |
|------|----------|---------|
| **PIN Auth** | Field employees, kiosk mode | `profile` object (no auth session) |
| **Email/Password** | Admins, supervisors | Full Supabase auth session |
| **Badge Scan** | Quick employee lookup | Employee info for PIN entry |

### Important: profile_id vs user_id

- `profile_id` - Always available, use for all clock operations
- `user_id` - Only for employees with Supabase Auth accounts (may be null)

### Company Features

Check `company_features` table to determine which features to enable:

```typescript
const { data: features } = await supabase
  .from('company_features')
  .select('*')
  .eq('company_id', companyId)
  .single();

// features.photo_capture - Require photos on clock
// features.geolocation - Capture GPS coordinates  
// features.employee_pin - PIN authentication enabled
```

---

## 📱 Core Screens

1. **Login** - Company ID + PIN entry
2. **Dashboard** - Clock status, quick actions
3. **Clock Action** - Photo capture, location, confirm
4. **Time History** - View past entries
5. **Task Scanner** - QR code scanning
6. **Time Off** - Submit PTO requests
7. **Settings** - Profile, preferences, logout

---

## 🔒 Security Notes

- Store auth tokens in `expo-secure-store` (not AsyncStorage)
- PINs are validated server-side only, never stored locally
- Photos upload to private `timeclock-photos` bucket
- All API calls use HTTPS
- RLS policies enforce company data isolation

---

## 📖 Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [React Navigation](https://reactnavigation.org)
- [Lucide Icons](https://lucide.dev)

---

## 🏗️ Project Structure

```
CICOMobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API & Supabase functions
│   ├── context/        # React Context providers
│   ├── constants/      # Theme, colors, config
│   └── types/          # TypeScript definitions
├── assets/             # Images, icons
└── app.json            # Expo config
```

---

## ❓ FAQ

**Q: Can PIN-only employees access database directly?**
A: No, use edge functions for all data access since they don't have an auth session.

**Q: What permissions are required?**
A: Camera (photos), Location (GPS), optionally Notifications.

**Q: Does it work offline?**
A: Queue clock actions locally and sync when connected. See `IMPLEMENTATION_NOTES.md`.
