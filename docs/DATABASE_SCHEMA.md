# CICO Database Schema Reference

## Overview

The CICO database uses PostgreSQL via Supabase with Row Level Security (RLS) for multi-tenant data isolation. All data is scoped by `company_id`.

---

## Core Tables

### profiles

Employee/user profiles. This is the central table for user information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,  -- NULL for PIN-only employees
  company_id UUID REFERENCES companies,
  department_id UUID REFERENCES departments,
  
  -- Personal Info
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Employment Info
  employee_id TEXT,           -- Company-assigned employee ID
  pin TEXT,                   -- 4-6 digit PIN for authentication
  status TEXT DEFAULT 'active',  -- active | inactive | terminated
  date_of_hire DATE,
  trade_number TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Points**:
- `id` (profile_id) is the primary identifier for most operations
- `user_id` is optional - NULL for employees who only use PIN auth
- `pin` is stored and validated at the database level
- `status` determines if employee can clock in

**RLS Policies**:
- Users can view/update their own profile
- Users can view all profiles in their company
- Admins can insert/update profiles in their company

---

### companies

Company/tenant records for multi-tenant architecture.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  company_logo_url TEXT,
  
  -- Contact
  phone TEXT NOT NULL,
  
  -- Address
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  
  -- Departments (legacy array field)
  departments TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### company_features

Feature flags per company to control app behavior.

```sql
CREATE TABLE company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  
  -- Feature Flags
  geolocation BOOLEAN DEFAULT true,      -- Capture GPS on clock events
  employee_pin BOOLEAN DEFAULT false,    -- Enable PIN authentication
  photo_capture BOOLEAN DEFAULT true,    -- Require photos on clock events
  
  -- Integration Tokens
  mapbox_public_token TEXT,  -- For address reverse geocoding
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage in Mobile App**:
```typescript
// Check if features are enabled before requesting permissions
const { data: features } = await supabase
  .from('company_features')
  .select('*')
  .eq('company_id', companyId)
  .single();

if (features.photo_capture) {
  // Request camera permission
}

if (features.geolocation) {
  // Request location permission
}
```

---

### time_entries

Clock in/out records - the core time tracking table.

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,    -- Optional (NULL for PIN-only)
  profile_id UUID REFERENCES profiles,   -- Required
  company_id UUID REFERENCES companies NOT NULL,
  project_id UUID REFERENCES projects,   -- Optional
  
  -- Time Data
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,                  -- NULL = currently clocked in
  duration_minutes INTEGER,              -- Calculated on clock out
  is_break BOOLEAN DEFAULT false,
  description TEXT,
  
  -- Clock In Location
  clock_in_latitude NUMERIC,
  clock_in_longitude NUMERIC,
  clock_in_address TEXT,
  clock_in_photo_url TEXT,
  
  -- Clock Out Location
  clock_out_latitude NUMERIC,
  clock_out_longitude NUMERIC,
  clock_out_address TEXT,
  clock_out_photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Points**:
- `end_time = NULL` indicates currently clocked in
- `duration_minutes` is calculated server-side on clock out
- Location and photo fields are optional based on company_features
- `is_break = true` for break entries

**Common Queries**:

```typescript
// Check if user is clocked in
const { data } = await supabase
  .from('time_entries')
  .select('id, start_time, project_id')
  .eq('profile_id', profileId)
  .is('end_time', null)
  .eq('is_break', false)
  .maybeSingle();

// Get today's entries
const today = new Date().toISOString().split('T')[0];
const { data } = await supabase
  .from('time_entries')
  .select('*')
  .eq('profile_id', profileId)
  .gte('start_time', `${today}T00:00:00`)
  .order('start_time', { ascending: false });

// Calculate total hours for date range
const { data } = await supabase
  .from('time_entries')
  .select('duration_minutes')
  .eq('profile_id', profileId)
  .gte('start_time', startDate)
  .lte('start_time', endDate)
  .eq('is_break', false);

const totalMinutes = data.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
const totalHours = totalMinutes / 60;
```

---

### projects

Projects/jobs that employees can clock into.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  client_id UUID REFERENCES clients,
  department_id UUID REFERENCES departments,
  
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active',
  is_active BOOLEAN DEFAULT true,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Financial
  hourly_rate NUMERIC,
  budget_per_hour NUMERIC,
  estimated_hours INTEGER,
  track_overtime BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Mobile App Usage**:
```typescript
// Get active projects for selection dropdown
const { data: projects } = await supabase
  .from('projects')
  .select('id, name, description')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

---

### departments

Company departments for organizing employees.

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### task_types

Predefined task types for task check-in.

```sql
CREATE TABLE task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  code TEXT NOT NULL,      -- Short code for QR (e.g., "ELEC", "PLUMB")
  name TEXT NOT NULL,      -- Display name (e.g., "Electrical Work")
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### task_activities

Records of task start/finish events.

```sql
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  project_id UUID REFERENCES projects NOT NULL,
  task_id UUID NOT NULL,            -- From QR code
  task_type_id UUID REFERENCES task_types NOT NULL,
  time_entry_id UUID REFERENCES time_entries NOT NULL,
  
  action_type task_action_type NOT NULL,  -- 'start' or 'finish'
  timestamp TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum: task_action_type**:
- `start` - Task started
- `finish` - Task completed

---

### time_off_requests

Employee time off (PTO) requests.

```sql
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  
  type time_off_type NOT NULL,
  status time_off_status DEFAULT 'pending',
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC,
  reason TEXT,
  
  -- Review Info
  reviewed_by UUID REFERENCES profiles,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum: time_off_type**:
- `vacation`
- `sick`
- `personal`
- `bereavement`
- `other`

**Enum: time_off_status**:
- `pending`
- `approved`
- `denied`
- `cancelled`

**Mobile App Usage**:
```typescript
// Submit time off request
const { data, error } = await supabase
  .from('time_off_requests')
  .insert({
    profile_id: profileId,
    company_id: companyId,
    type: 'vacation',
    start_date: '2024-02-01',
    end_date: '2024-02-05',
    hours_requested: 40,
    reason: 'Family vacation',
  });

// Get user's requests
const { data } = await supabase
  .from('time_off_requests')
  .select('*')
  .eq('profile_id', profileId)
  .order('created_at', { ascending: false });
```

---

### overtime_entries

Overtime hour records.

```sql
CREATE TABLE overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  time_entry_id UUID REFERENCES time_entries,
  
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  reason TEXT,
  
  status overtime_status DEFAULT 'pending',
  approved_by UUID REFERENCES profiles,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum: overtime_status**:
- `pending`
- `approved`
- `denied`

---

### employee_schedules

Per-employee work schedules.

```sql
CREATE TABLE employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  
  day_of_week INTEGER NOT NULL,  -- 0 = Sunday, 6 = Saturday
  start_time TIME,               -- NULL if is_day_off = true
  end_time TIME,
  is_day_off BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### department_schedules

Default schedules by department.

```sql
CREATE TABLE department_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  
  day_of_week INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  is_day_off BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### user_roles

Role assignments for access control.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  profile_id UUID REFERENCES profiles,
  role app_role NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum: app_role**:
- `admin` - Full access, can manage users and settings
- `supervisor` - Can approve requests and view team data
- `employee` - Standard employee access
- `foreman` - Field supervisor role

**Checking Roles**:
```typescript
// Using RPC function
const { data: isAdmin } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'admin',
});

// Direct query (for authenticated users)
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);
```

---

### user_certifications

Employee certifications and licenses.

```sql
CREATE TABLE user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  
  cert_name TEXT NOT NULL,
  cert_code TEXT NOT NULL,
  cert_number TEXT,
  certifier_name TEXT,
  
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'Active',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### employee_assignments

Equipment/assets assigned to employees.

```sql
CREATE TABLE employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  
  category assignment_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  
  assigned_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum: assignment_category**:
- `tools`
- `fleet`
- `tech_assets`
- `equipment`
- `cards`

---

### clients

Client/customer records for projects.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  company_name TEXT NOT NULL,
  
  contact_person_name TEXT,
  contact_person_title TEXT,
  email TEXT,
  phone TEXT,
  
  street_address TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### badge_templates

Templates for employee badge design.

```sql
CREATE TABLE badge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  
  name TEXT DEFAULT 'Default Template',
  background_url TEXT,
  template_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### admin_time_adjustments

Audit log for admin time entry modifications.

```sql
CREATE TABLE admin_time_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies NOT NULL,
  time_entry_id UUID REFERENCES time_entries NOT NULL,
  
  admin_user_id UUID NOT NULL,      -- Who made the change
  affected_user_id UUID NOT NULL,   -- Whose entry was changed
  
  action_type TEXT NOT NULL,        -- 'edit', 'delete', etc.
  reason TEXT,
  
  -- Original values
  old_start_time TIMESTAMPTZ,
  old_end_time TIMESTAMPTZ,
  
  -- New values
  new_start_time TIMESTAMPTZ,
  new_end_time TIMESTAMPTZ NOT NULL,
  
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Database Functions

### authenticate_employee_pin

Validates PIN against company.

```sql
SELECT * FROM authenticate_employee_pin(
  _company_id := 'company-uuid',
  _pin := '123456'
);
```

Returns: Profile data if valid, empty if invalid.

### get_current_user_company_id

Returns company_id for authenticated user.

```sql
SELECT get_current_user_company_id();
```

### has_role

Checks if user has specific role.

```sql
SELECT has_role(
  'user-uuid',
  'admin'::app_role
);
```

Returns: BOOLEAN

### lookup_employee_by_identifier

Finds employee by ID, phone, or email.

```sql
SELECT * FROM lookup_employee_by_identifier(
  _company_id := 'company-uuid',
  _identifier := 'EMP001'
);
```

---

## Row Level Security (RLS) Patterns

### Company Isolation Pattern

Most tables use this pattern to ensure users only see data from their company:

```sql
-- SELECT policy
CREATE POLICY "Users can view X in their company"
ON table_name
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE user_id = auth.uid()
  )
);
```

### Role-Based Access Pattern

For admin/supervisor-only operations:

```sql
-- INSERT policy for admins only
CREATE POLICY "Admins can insert X"
ON table_name
FOR INSERT
WITH CHECK (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin')
);
```

### Owner-Based Access Pattern

For user-specific data:

```sql
-- Users can only modify their own records
CREATE POLICY "Users can update own X"
ON table_name
FOR UPDATE
USING (
  auth.uid() = user_id
  AND company_id IN (
    SELECT company_id FROM profiles
    WHERE user_id = auth.uid()
  )
);
```

---

## Indexes

Key indexes for performance:

```sql
-- Time entries by profile and date
CREATE INDEX idx_time_entries_profile_date 
ON time_entries (profile_id, start_time DESC);

-- Time entries by company
CREATE INDEX idx_time_entries_company 
ON time_entries (company_id);

-- Profiles by company
CREATE INDEX idx_profiles_company 
ON profiles (company_id);

-- Active time entries (currently clocked in)
CREATE INDEX idx_time_entries_active 
ON time_entries (profile_id) 
WHERE end_time IS NULL;
```

---

## TypeScript Types

The full database types are included in the documentation package:

**File:** `docs/SUPABASE_TYPES.ts`

Copy this file to your Expo project at `src/integrations/supabase/types.ts` for type-safe development.

**Installation:**
```bash
# Copy to your Expo project
cp docs/SUPABASE_TYPES.ts your-expo-project/src/integrations/supabase/types.ts
```

**Usage:**
```typescript
import { 
  Database, 
  Tables, 
  TablesInsert, 
  Enums,
  // Pre-exported type aliases
  Profile,
  TimeEntry,
  Project,
  AppRole,
  TimeOffType
} from '@/integrations/supabase/types';

// Option 1: Use pre-exported aliases
const profile: Profile = { ... };
const entry: TimeEntry = { ... };

// Option 2: Use helper types
type MyProfile = Tables<'profiles'>;
type NewTimeEntry = TablesInsert<'time_entries'>;
type Role = Enums<'app_role'>;

// Access enum constants for dropdowns
import { Constants } from '@/integrations/supabase/types';

const roleOptions = Constants.public.Enums.app_role;
// ['admin', 'supervisor', 'employee', 'foreman']

const timeOffTypes = Constants.public.Enums.time_off_type;
// ['vacation', 'sick', 'personal', 'bereavement', 'other']
```

**Key Types for Mobile App:**

| Type | Description |
|------|-------------|
| `Profile` | Employee profile data |
| `TimeEntry` | Clock in/out records |
| `Project` | Projects for time tracking |
| `Company` | Company/tenant data |
| `CompanyFeatures` | Feature flags per company |
| `TimeOffRequest` | PTO requests |
| `TaskActivity` | Task check-in records |
| `AppRole` | User role enum |
| `TimeOffType` | Time off type enum |
| `TimeOffStatus` | Request status enum |
