# CICO Supabase Integration Guide

## Connection Configuration

### Environment Variables

```typescript
// Supabase Configuration
const SUPABASE_URL = "https://ahtiicqunajyyasuxebj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodGlpY3F1bmFqeXlhc3V4ZWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzA5OTgsImV4cCI6MjA3MDAwNjk5OH0._s6TMn5NdiZCbE5Gy4bf6aFuSW-JJpRyoLg6FxV134A";
```

### Client Initialization (Expo/React Native)

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Authentication Methods

### Method 1: PIN Authentication (Primary for Employees)

Most employees use PIN-only authentication without Supabase Auth accounts. This method uses the `authenticate-pin` edge function.

```typescript
interface PinAuthRequest {
  company_id: string;  // UUID of the company
  pin: string;         // 4-6 digit PIN
}

interface PinAuthResponse {
  success: boolean;
  user: {
    id: string;           // profile.id (NOT user_id)
    user_id: string | null;
    display_name: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company_id: string;
    department_id: string | null;
    avatar_url: string | null;
    employee_id: string | null;
  };
}

// Usage
async function authenticateWithPin(companyId: string, pin: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/authenticate-pin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        company_id: companyId,
        pin: pin,
      }),
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }
  
  return data;
}
```

**Important Notes:**
- PIN authentication returns a `profile` object, NOT a Supabase Auth user
- The `id` in the response is `profile.id` - use this for all subsequent API calls as `profile_id`
- `user_id` may be null for PIN-only employees
- Store `company_id` and `profile.id` locally for subsequent operations

### Method 2: Email/Password Authentication (Admins & Supervisors)

For users with full Supabase Auth accounts (typically admins/supervisors).

```typescript
// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@company.com',
  password: 'password123',
});

// Get Session
const { data: { session } } = await supabase.auth.getSession();

// Sign Out
await supabase.auth.signOut();

// Listen for Auth Changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // User signed in
  } else if (event === 'SIGNED_OUT') {
    // User signed out
  }
});
```

### Method 3: Badge/QR Lookup

Scan employee badge QR code and look up employee by identifier.

```typescript
interface LookupRequest {
  company_id: string;
  identifier: string;  // Employee ID, phone, or email
}

interface LookupResponse {
  success: boolean;
  employee: {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    employee_id: string | null;
    has_pin: boolean;
  };
}

async function lookupEmployee(companyId: string, identifier: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/lookup-employee`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        company_id: companyId,
        identifier: identifier,
      }),
    }
  );
  
  return response.json();
}
```

---

## Edge Functions API Reference

### 1. authenticate-pin

**Purpose**: Authenticate employee using company-scoped PIN

**Endpoint**: `POST /functions/v1/authenticate-pin`

**Auth Required**: No (public endpoint)

**Request**:
```json
{
  "company_id": "uuid",
  "pin": "123456"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "user": {
    "id": "profile-uuid",
    "user_id": "auth-user-uuid-or-null",
    "display_name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "company_id": "company-uuid",
    "department_id": "dept-uuid",
    "avatar_url": "https://...",
    "employee_id": "EMP001"
  }
}
```

**Response (Error)**:
```json
{
  "error": "Invalid PIN"
}
```

**Error Codes**:
- 400: Missing company_id or pin
- 401: Invalid PIN or authentication failed
- 500: Server error

---

### 2. lookup-employee

**Purpose**: Find employee by identifier (ID, phone, email)

**Endpoint**: `POST /functions/v1/lookup-employee`

**Auth Required**: No

**Request**:
```json
{
  "company_id": "uuid",
  "identifier": "EMP001"
}
```

**Response**:
```json
{
  "success": true,
  "employee": {
    "id": "profile-uuid",
    "display_name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://...",
    "employee_id": "EMP001",
    "has_pin": true
  }
}
```

---

### 3. check-clock-status

**Purpose**: Check if employee is currently clocked in

**Endpoint**: `POST /functions/v1/check-clock-status`

**Auth Required**: No

**Request**:
```json
{
  "profile_id": "profile-uuid",
  "company_id": "company-uuid"
}
```

**Response (Clocked In)**:
```json
{
  "clocked_in": true,
  "active_entry": {
    "id": "time-entry-uuid",
    "start_time": "2024-01-15T08:00:00Z",
    "project_id": "project-uuid",
    "is_break": false
  }
}
```

**Response (Clocked Out)**:
```json
{
  "clocked_in": false,
  "active_entry": null
}
```

---

### 4. clock-in-out

**Purpose**: Record clock in, clock out, or break

**Endpoint**: `POST /functions/v1/clock-in-out`

**Auth Required**: No

**Request (Clock In)**:
```json
{
  "action": "clock_in",
  "profile_id": "profile-uuid",
  "company_id": "company-uuid",
  "project_id": "project-uuid",
  "photo_url": "https://storage.../photo.jpg",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "address": "123 Main St, San Francisco, CA"
}
```

**Request (Clock Out)**:
```json
{
  "action": "clock_out",
  "profile_id": "profile-uuid",
  "company_id": "company-uuid",
  "time_entry_id": "active-entry-uuid",
  "photo_url": "https://storage.../photo.jpg",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "address": "123 Main St, San Francisco, CA"
}
```

**Request (Break)**:
```json
{
  "action": "break",
  "profile_id": "profile-uuid",
  "company_id": "company-uuid"
}
```

**Response (Clock In)**:
```json
{
  "success": true,
  "time_entry": {
    "id": "new-entry-uuid",
    "start_time": "2024-01-15T08:00:00Z",
    "profile_id": "profile-uuid",
    "company_id": "company-uuid"
  }
}
```

**Response (Clock Out)**:
```json
{
  "success": true,
  "time_entry": {
    "id": "entry-uuid",
    "start_time": "2024-01-15T08:00:00Z",
    "end_time": "2024-01-15T17:00:00Z",
    "duration_minutes": 540
  }
}
```

**Important Notes**:
- `profile_id` is required (from PIN auth response)
- `user_id` is optional (will be null for PIN-only employees)
- `time_entry_id` is required for clock_out action
- Photo and location fields are optional but recommended

---

### 5. verify-task

**Purpose**: Validate task QR code and get task details

**Endpoint**: `POST /functions/v1/verify-task`

**Auth Required**: No

**Request**:
```json
{
  "company_id": "company-uuid",
  "task_code": "TASK-001"
}
```

**Response**:
```json
{
  "success": true,
  "task": {
    "id": "task-uuid",
    "name": "Electrical Work",
    "code": "TASK-001",
    "project_id": "project-uuid",
    "project_name": "Building A Construction"
  },
  "task_type": {
    "id": "task-type-uuid",
    "name": "Electrical",
    "code": "ELEC"
  }
}
```

---

### 6. record-task-activity

**Purpose**: Record task start or finish

**Endpoint**: `POST /functions/v1/record-task-activity`

**Auth Required**: No

**Request**:
```json
{
  "profile_id": "profile-uuid",
  "company_id": "company-uuid",
  "task_id": "task-uuid",
  "project_id": "project-uuid",
  "task_type_id": "task-type-uuid",
  "time_entry_id": "current-time-entry-uuid",
  "action_type": "start"
}
```

**action_type values**: `start` | `finish`

**Response**:
```json
{
  "success": true,
  "activity": {
    "id": "activity-uuid",
    "timestamp": "2024-01-15T09:30:00Z",
    "action_type": "start"
  }
}
```

---

### 7. verify-badge

**Purpose**: Verify employee badge QR code

**Endpoint**: `POST /functions/v1/verify-badge`

**Auth Required**: No

**Request**:
```json
{
  "badge_data": "encrypted-badge-string"
}
```

**Response**:
```json
{
  "valid": true,
  "employee": {
    "id": "profile-uuid",
    "display_name": "John Doe",
    "employee_id": "EMP001",
    "company_id": "company-uuid"
  }
}
```

---

### 8. generate-badge

**Purpose**: Generate badge data for display/printing

**Endpoint**: `POST /functions/v1/generate-badge`

**Auth Required**: No

**Request**:
```json
{
  "profile_id": "profile-uuid"
}
```

**Response**:
```json
{
  "badge_data": "encrypted-string-for-qr",
  "employee": {
    "display_name": "John Doe",
    "employee_id": "EMP001",
    "department": "Engineering",
    "avatar_url": "https://..."
  }
}
```

---

### 9. auto-close-tasks-on-shift-end

**Purpose**: Automatically close open tasks when employee clocks out

**Endpoint**: `POST /functions/v1/auto-close-tasks-on-shift-end`

**Auth Required**: Yes (Bearer token)

**Request**:
```json
{
  "profile_id": "profile-uuid",
  "company_id": "company-uuid",
  "time_entry_id": "time-entry-uuid"
}
```

---

## Admin-Only Edge Functions

These functions require authentication with an admin role.

### admin-retroactive-clockout

**Purpose**: Modify time entry (admin edit)

**Auth Required**: Yes (Admin role)

**Headers**:
```
Authorization: Bearer <access_token>
```

### create-user

**Purpose**: Create new employee profile

**Auth Required**: Yes (Admin role)

### create-auth-account

**Purpose**: Create auth account for existing profile

**Auth Required**: Yes (Admin role)

### admin-reset-password

**Purpose**: Reset user password

**Auth Required**: Yes (Admin role)

---

## Direct Database Access

For authenticated users, you can query tables directly using the Supabase client. RLS policies enforce company-level data isolation.

### Querying Time Entries

```typescript
// Get today's entries for a profile
const today = new Date().toISOString().split('T')[0];

const { data, error } = await supabase
  .from('time_entries')
  .select(`
    id,
    start_time,
    end_time,
    duration_minutes,
    is_break,
    project:projects(id, name),
    clock_in_photo_url,
    clock_out_photo_url
  `)
  .eq('profile_id', profileId)
  .gte('start_time', `${today}T00:00:00`)
  .order('start_time', { ascending: false });
```

### Querying Projects

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, name, description')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

### Querying Time Off Requests

```typescript
const { data, error } = await supabase
  .from('time_off_requests')
  .select('*')
  .eq('profile_id', profileId)
  .order('created_at', { ascending: false });
```

### Creating Time Off Request

```typescript
const { data, error } = await supabase
  .from('time_off_requests')
  .insert({
    profile_id: profileId,
    company_id: companyId,
    type: 'vacation', // vacation | sick | personal | bereavement | other
    start_date: '2024-02-01',
    end_date: '2024-02-05',
    hours_requested: 40,
    reason: 'Family vacation',
  })
  .select()
  .single();
```

---

## Storage Buckets

### Bucket: `timeclock-photos`

**Access**: Private (requires signed URLs)

**Purpose**: Store clock in/out verification photos

**Upload Example**:
```typescript
async function uploadClockPhoto(
  profileId: string,
  photoBlob: Blob,
  type: 'clock_in' | 'clock_out'
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${profileId}/${type}_${timestamp}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('timeclock-photos')
    .upload(fileName, photoBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('timeclock-photos')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

### Bucket: `avatars`

**Access**: Public

**Purpose**: Employee profile photos

### Bucket: `badge-backgrounds`

**Access**: Public

**Purpose**: Badge template background images

---

## Database RPC Functions

### authenticate_employee_pin

```typescript
const { data, error } = await supabase.rpc('authenticate_employee_pin', {
  _company_id: companyId,
  _pin: pin,
});
```

### lookup_employee_by_identifier

```typescript
const { data, error } = await supabase.rpc('lookup_employee_by_identifier', {
  _company_id: companyId,
  _identifier: identifier,
});
```

### get_current_user_company_id

```typescript
// Returns company_id for authenticated user
const { data, error } = await supabase.rpc('get_current_user_company_id');
```

### has_role

```typescript
// Check if user has specific role
const { data, error } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'admin', // admin | supervisor | employee | foreman
});
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PIN` | 401 | PIN authentication failed |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_CLOCKED_IN` | 400 | User is already clocked in |
| `NOT_CLOCKED_IN` | 400 | User is not clocked in |
| `INVALID_COMPANY` | 400 | Company ID is invalid |
| `PERMISSION_DENIED` | 403 | User lacks required role |
| `VALIDATION_ERROR` | 400 | Request validation failed |

### Error Handling Example

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<Response>
): Promise<T> {
  try {
    const response = await apiCall();
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        data.error || 'Unknown error',
        response.status,
        data.code
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0, 'NETWORK_ERROR');
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}
```

---

## Rate Limiting & Best Practices

### Rate Limits
- Edge Functions: 100 requests per minute per IP
- Database queries: 1000 per minute per user

### Best Practices

1. **Cache company_id and profile_id locally** after authentication
2. **Check clock status** before showing clock in/out buttons
3. **Upload photos before** calling clock-in-out function
4. **Use batch queries** when possible to reduce API calls
5. **Implement retry logic** for failed requests
6. **Handle offline gracefully** with local queue

### Recommended Request Flow

```
1. Check local cache for credentials
2. Validate session/PIN if needed
3. Check clock status
4. Capture photo (if required)
5. Upload photo to storage
6. Call clock-in-out with photo URL
7. Update local state
8. Sync any queued offline actions
```
