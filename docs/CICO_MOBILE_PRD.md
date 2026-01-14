# CICO Mobile App - Product Requirements Document

## Executive Summary

CICO Mobile is a native mobile application built with Expo/React Native for iOS and Android platforms. It provides employees with a streamlined interface for time tracking, task management, and attendance monitoring, integrating seamlessly with the existing CICO web-based Supabase backend.

### Project Goals
- Provide native mobile experience for clock in/out operations
- Enable PIN-based authentication for employees without email accounts
- Support photo verification and geolocation capture
- Allow task check-in via QR code scanning
- Deliver offline-capable time tracking

---

## User Personas

### 1. Field Employee
- **Description**: Workers who need to clock in/out at job sites
- **Needs**: Quick PIN entry, photo capture, location tracking
- **Technical Level**: Basic smartphone user
- **Key Features**: Clock in/out, break recording, view schedule

### 2. Office Employee
- **Description**: Staff with regular schedules who clock from personal devices
- **Needs**: Easy access to time tracking, time off requests
- **Technical Level**: Moderate
- **Key Features**: Clock in/out, view history, submit PTO requests

### 3. Supervisor
- **Description**: Team leads who monitor their team's attendance
- **Needs**: View team status, approve requests
- **Technical Level**: Moderate to advanced
- **Key Features**: Team dashboard, approve time off, view reports

### 4. Kiosk User (Shared Device)
- **Description**: Multiple employees using a shared tablet/phone
- **Needs**: Quick employee switching, PIN entry
- **Technical Level**: Basic
- **Key Features**: Employee lookup, PIN authentication, rapid clock operations

---

## Core Features

### 1. Authentication

#### PIN-Based Login (Primary for Employees)
- 4-6 digit numeric PIN entry
- Company ID required (can be saved locally)
- No email/password required for basic employees
- Immediate access to clock functions

#### Email/Password Login (Admins & Supervisors)
- Standard Supabase Auth
- Session persistence with secure storage
- Role-based feature access

#### QR Badge Scan
- Scan employee badge QR code
- Auto-populate employee for clock operations
- Useful for kiosk/shared device mode

### 2. Clock In/Out

#### Clock In Flow
1. Authenticate (PIN or badge scan)
2. Request camera permission (if photo required)
3. Capture selfie photo
4. Request location permission (if geolocation enabled)
5. Capture GPS coordinates
6. Optional: Select project/job
7. Submit clock-in request
8. Display confirmation with timestamp

#### Clock Out Flow
1. Authenticate (if in kiosk mode)
2. Capture clock-out photo
3. Capture GPS coordinates
4. Calculate duration
5. Submit clock-out request
6. Display summary (hours worked)

#### Break Recording
- Start break button (while clocked in)
- End break button
- Break duration tracking
- Separate break entries in time_entries

### 3. Project/Job Selection
- List of active projects for company
- Search/filter projects
- Remember last used project
- Optional field (company configurable)

### 4. Task Check-In (QR Scanner)

#### Task Start Flow
1. Scan task QR code
2. Validate task exists and is active
3. Confirm task details
4. Record task start activity
5. Show active task indicator

#### Task Finish Flow
1. Scan same task QR code (or select from active)
2. Record task finish activity
3. Calculate task duration
4. Show completion summary

### 5. Time Entry History
- View personal time entries
- Filter by date range
- Show clock in/out times
- Display duration per entry
- Show associated project/task

### 6. Time Off Requests
- Request types: Vacation, Sick, Personal, Bereavement, Other
- Date range selection
- Hours calculation
- Reason/notes field
- Submit for approval
- View request status

### 7. Schedule View
- View personal weekly schedule
- Show expected hours per day
- Highlight current day
- Display department schedule if no personal schedule

### 8. Push Notifications (Future)
- Clock-in reminders
- Schedule change alerts
- Time off request status updates
- Overtime warnings

---

## Technical Requirements

### Platform Requirements
- **iOS**: 13.0 or later
- **Android**: API 21 (Android 5.0) or later
- **Expo SDK**: 50 or later

### Required Permissions

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| Camera | Photo capture for clock events | First clock action |
| Location (When In Use) | GPS coordinates for clock events | First clock action |
| Notifications | Schedule reminders (future) | App launch or settings |

### Dependencies
```json
{
  "@supabase/supabase-js": "^2.x",
  "expo-camera": "latest",
  "expo-location": "latest",
  "expo-secure-store": "latest",
  "expo-barcode-scanner": "latest",
  "expo-image-picker": "latest",
  "@react-navigation/native": "^6.x",
  "@react-navigation/stack": "^6.x",
  "react-native-safe-area-context": "latest",
  "date-fns": "^3.x"
}
```

### Offline Support
- Cache company_id and profile_id locally
- Queue clock actions when offline
- Sync pending actions on reconnection
- Show offline indicator in UI
- Store last known clock status

### Security Requirements
- Store auth tokens in Expo SecureStore
- Never store passwords locally
- PIN is validated server-side only
- Photos uploaded to private bucket
- HTTPS for all API calls

---

## User Flows

### Flow 1: First-Time Setup (Personal Device)

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enter Company   │
│ ID or Scan Code │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enter PIN or   │
│  Email/Password │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Save Company & │
│  Profile Locally│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │
└─────────────────┘
```

### Flow 2: Daily Clock In (Returning User)

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enter PIN      │
│  (6 digits)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Capture Photo  │
│  (Selfie)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Confirm Clock  │
│  In Details     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Success!       │
│  Show Dashboard │
└─────────────────┘
```

### Flow 3: Kiosk Mode (Shared Device)

```
┌─────────────────┐
│  Idle Screen    │
│  "Tap to Start" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scan Badge OR  │
│  Enter PIN      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Show Employee  │
│  Name & Photo   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clock In/Out   │
│  Button         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Success!       │
│  Return to Idle │
└─────────────────┘
```

---

## Screen Specifications

### 1. Login Screen
- Company ID input (with option to scan QR)
- PIN input (numeric keyboard, masked)
- "Use Email Instead" link for admins
- Remember company toggle
- Company logo display (if available)

### 2. Dashboard Screen
- Current clock status (Clocked In/Out)
- Current shift duration (if clocked in)
- Active task indicator (if any)
- Quick action buttons:
  - Clock In / Clock Out
  - Start Break / End Break
  - Scan Task
- Today's summary (hours worked)

### 3. Clock Action Screen
- Camera preview for photo capture
- Capture button
- Retake option
- Location status indicator
- Project selector (if enabled)
- Confirm button
- Loading state during submission

### 4. Task Scanner Screen
- Full-screen camera for QR scanning
- Manual entry option
- Scan frame overlay
- Flash toggle
- Recent tasks list

### 5. Time History Screen
- List of time entries
- Date range filter (quick: Today, This Week, This Month)
- Entry cards showing:
  - Date
  - Clock in/out times
  - Duration
  - Project name
- Tap for details

### 6. Time Off Request Screen
- Request type selector
- Start date picker
- End date picker
- Hours calculation display
- Reason text input
- Submit button
- View pending requests

### 7. Settings Screen
- Company information
- User profile (name, email, employee ID)
- Change PIN (if applicable)
- Notification preferences
- Clear saved data
- Logout button
- App version

---

## API Integration Points

### Primary Edge Functions

| Screen | Edge Function | Purpose |
|--------|--------------|---------|
| Login | `authenticate-pin` | Validate PIN |
| Login | `lookup-employee` | Find by badge/ID |
| Dashboard | `check-clock-status` | Get current status |
| Clock Action | `clock-in-out` | Record clock event |
| Task Scanner | `verify-task` | Validate task QR |
| Task Scanner | `record-task-activity` | Record task action |

### Direct Database Queries

| Screen | Table | Query Type |
|--------|-------|------------|
| Dashboard | `time_entries` | Today's entries |
| Time History | `time_entries` | Historical entries |
| Project Select | `projects` | Active projects |
| Time Off | `time_off_requests` | User's requests |
| Settings | `profiles` | User profile |

---

## Success Metrics

### Performance
- App launch to dashboard: < 2 seconds
- Clock action completion: < 5 seconds
- Photo capture to upload: < 3 seconds

### Reliability
- Offline clock success rate: > 95%
- Sync success rate: > 99%
- Crash-free sessions: > 99.5%

### User Adoption
- Daily active users vs web
- Average time to clock in
- Feature usage rates

---

## Future Enhancements (v2+)

1. **Biometric Authentication**: Face ID / Fingerprint unlock
2. **Geofencing**: Auto-prompt clock based on location
3. **Team View**: Supervisors see team status
4. **Offline Photos**: Queue photos for upload
5. **Widgets**: iOS/Android home screen widgets
6. **Apple Watch / WearOS**: Quick clock actions
7. **Voice Commands**: "Hey Siri, clock me in"

---

## Appendix: Company Feature Flags

The following features are configurable per company and should be checked before enabling related functionality:

| Feature Flag | Default | Affects |
|--------------|---------|---------|
| `employee_pin` | false | PIN authentication availability |
| `photo_capture` | true | Require photos on clock |
| `geolocation` | true | Capture GPS coordinates |
| `mapbox_public_token` | null | Address reverse geocoding |

Query `company_features` table to get current settings.
