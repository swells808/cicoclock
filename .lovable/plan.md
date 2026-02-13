

# Fix: Timecard Dialog Not Appearing on iPad

## Problem

When clocking out on iPad, the shift summary/timecard dialog never appears. The clock-out completes successfully (photos captured, time entry closed) but without collecting timecard allocations or injury reporting.

## Root Cause

The `handlePhotoCapture` callback reads `photoAction` from a stale JavaScript closure. The parent component re-renders every second (clock timer), but by the time the photo auto-capture fires 3+ seconds later, the callback is holding onto an outdated `photoAction` value of `null`. This means neither the clock-in nor clock-out branch executes after the photo is captured -- the photo uploads but `performClockOut` is never called, so the timecard dialog never opens.

This same ref pattern was already applied to `activeTimeEntry`, `authenticatedEmployee`, and `company` in this file -- `photoAction` and `companyFeatures` were simply missed.

## Changes (single file: `src/pages/Timeclock.tsx`)

### 1. Add ref-backed state for `photoAction`

Convert `photoAction` to use the same ref pattern already used for other state variables:

```typescript
const [photoAction, _setPhotoAction] = useState(null);
const photoActionRef = useRef(null);
const setPhotoAction = (action) => {
  photoActionRef.current = action;
  _setPhotoAction(action);
};
```

### 2. Add ref for `companyFeatures`

Keep a ref in sync so `handleClockOut` (called from the auto-trigger effect) always reads the current value:

```typescript
const companyFeaturesRef = useRef(companyFeatures);
companyFeaturesRef.current = companyFeatures;
```

### 3. Update callbacks to read from refs

- `handlePhotoCapture`: read `photoActionRef.current` instead of `photoAction`
- `onSkip` / `onCancel` callbacks for PhotoCapture: read `photoActionRef.current`
- `handleClockIn` / `handleClockOut`: read `companyFeaturesRef.current`

### 4. Remove the 300ms setTimeout

Open the timecard dialog immediately in `performClockOut` instead of scheduling it with a delay.

### 5. Clean up debug logging

Remove the extensive `console.log` statements added during previous debugging iterations.

## Why Previous Fixes Failed

They addressed symptoms (touch event dismissal, dialog interaction blocking) rather than the root cause: the `photoAction` value being `null` inside the stale closure, preventing `performClockOut` from ever being called.

