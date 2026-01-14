# CICO Design System Guide

## Overview

This document defines the complete design system for the CICO application, ensuring visual consistency between the web and mobile applications.

---

## Color System

### Color Format

All colors are defined in HSL format for easy manipulation and theming.

### Light Mode Palette

```css
/* Primary Brand Colors */
--primary: 213 94% 68%;           /* #5296ED - Main brand blue */
--primary-foreground: 0 0% 100%;  /* White text on primary */

/* Background Colors */
--background: 0 0% 100%;          /* #FFFFFF - Page background */
--foreground: 222.2 84% 4.9%;     /* #020817 - Primary text */

/* Secondary Colors */
--secondary: 217 91% 60%;         /* #3B82F6 - Secondary blue */
--secondary-foreground: 0 0% 100%;

/* Muted Colors (for subtle backgrounds) */
--muted: 210 40% 96.1%;           /* #F1F5F9 - Muted background */
--muted-foreground: 215.4 16.3% 46.9%; /* #64748B - Muted text */

/* Accent Colors */
--accent: 210 40% 96.1%;          /* Same as muted */
--accent-foreground: 222.2 47.4% 11.2%;

/* Card Colors */
--card: 0 0% 100%;                /* White cards */
--card-foreground: 222.2 84% 4.9%;

/* Popover Colors */
--popover: 0 0% 100%;
--popover-foreground: 222.2 84% 4.9%;

/* Border & Input */
--border: 214.3 31.8% 91.4%;      /* #E2E8F0 - Borders */
--input: 214.3 31.8% 91.4%;       /* Same as border */
--ring: 213 94% 68%;              /* Focus ring - matches primary */

/* Semantic Colors */
--destructive: 0 84.2% 60.2%;     /* #EF4444 - Red for errors/delete */
--destructive-foreground: 0 0% 100%;

/* Sidebar Colors */
--sidebar-background: 0 0% 98%;
--sidebar-foreground: 240 5.3% 26.1%;
--sidebar-primary: 213 94% 68%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 240 4.8% 95.9%;
--sidebar-accent-foreground: 240 5.9% 10%;
--sidebar-border: 220 13% 91%;
```

### Dark Mode Palette

```css
/* Primary */
--primary: 142 76% 46%;           /* #22C55E - Green for dark mode */
--primary-foreground: 355.7 100% 97.3%;

/* Backgrounds */
--background: 222.2 84% 4.9%;     /* #020817 - Dark background */
--foreground: 210 40% 98%;        /* #F8FAFC - Light text */

/* Secondary */
--secondary: 217.2 32.6% 17.5%;
--secondary-foreground: 210 40% 98%;

/* Muted */
--muted: 217.2 32.6% 17.5%;       /* #1E293B */
--muted-foreground: 215 20.2% 65.1%;

/* Accent */
--accent: 217.2 32.6% 17.5%;
--accent-foreground: 210 40% 98%;

/* Cards */
--card: 222.2 84% 4.9%;
--card-foreground: 210 40% 98%;

/* Popovers */
--popover: 222.2 84% 4.9%;
--popover-foreground: 210 40% 98%;

/* Borders */
--border: 217.2 32.6% 17.5%;
--input: 217.2 32.6% 17.5%;
--ring: 142 76% 46%;

/* Destructive */
--destructive: 0 62.8% 30.6%;
--destructive-foreground: 0 0% 100%;

/* Sidebar */
--sidebar-background: 240 5.9% 10%;
--sidebar-foreground: 240 4.8% 95.9%;
--sidebar-primary: 142 76% 46%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 240 3.7% 15.9%;
--sidebar-accent-foreground: 240 4.8% 95.9%;
--sidebar-border: 240 3.7% 15.9%;
```

### Status Colors

```css
/* Success - Green */
--success: 142 76% 36%;           /* #16A34A */
--success-foreground: 0 0% 100%;

/* Warning - Yellow/Orange */
--warning: 45 93% 47%;            /* #EAB308 */
--warning-foreground: 0 0% 0%;

/* Info - Blue */
--info: 199 89% 48%;              /* #0EA5E9 */
--info-foreground: 0 0% 100%;

/* Error - Red (same as destructive) */
--error: 0 84.2% 60.2%;           /* #EF4444 */
--error-foreground: 0 0% 100%;
```

### Color Usage in React Native

```typescript
// colors.ts
export const colors = {
  light: {
    primary: 'hsl(213, 94%, 68%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222.2, 84%, 4.9%)',
    muted: 'hsl(210, 40%, 96.1%)',
    mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    border: 'hsl(214.3, 31.8%, 91.4%)',
    destructive: 'hsl(0, 84.2%, 60.2%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(45, 93%, 47%)',
  },
  dark: {
    primary: 'hsl(142, 76%, 46%)',
    primaryForeground: 'hsl(355.7, 100%, 97.3%)',
    background: 'hsl(222.2, 84%, 4.9%)',
    foreground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(217.2, 32.6%, 17.5%)',
    mutedForeground: 'hsl(215, 20.2%, 65.1%)',
    border: 'hsl(217.2, 32.6%, 17.5%)',
    destructive: 'hsl(0, 62.8%, 30.6%)',
    success: 'hsl(142, 76%, 46%)',
    warning: 'hsl(45, 93%, 47%)',
  },
};
```

---

## Typography

### Font Family

The web app uses system fonts for optimal performance. The mobile app should follow platform conventions:

```typescript
// typography.ts
export const fontFamily = {
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
};
```

### Font Sizes

```typescript
// Using a 4px base scale
export const fontSize = {
  xs: 12,     // Small labels, captions
  sm: 14,     // Secondary text, descriptions
  base: 16,   // Body text (default)
  lg: 18,     // Large body text
  xl: 20,     // Small headings
  '2xl': 24,  // Medium headings
  '3xl': 30,  // Large headings
  '4xl': 36,  // Extra large headings
  '5xl': 48,  // Hero text
};

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};
```

### Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 36px | Bold | 1.25 |
| H2 | 30px | Bold | 1.25 |
| H3 | 24px | Semibold | 1.25 |
| H4 | 20px | Semibold | 1.25 |
| Body | 16px | Normal | 1.5 |
| Body Small | 14px | Normal | 1.5 |
| Caption | 12px | Normal | 1.5 |
| Button | 14px | Medium | 1 |
| Input | 16px | Normal | 1 |

---

## Spacing System

Based on a 4px grid system:

```typescript
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
};
```

### Common Spacing Patterns

| Use Case | Value |
|----------|-------|
| Icon padding | 8px |
| Button padding (horizontal) | 16px |
| Button padding (vertical) | 10px |
| Card padding | 16px or 24px |
| Section gap | 24px or 32px |
| List item gap | 12px |
| Input gap | 8px |

---

## Border Radius

```typescript
export const borderRadius = {
  none: 0,
  sm: 4,      // Subtle rounding
  md: 8,      // Default for buttons, inputs
  lg: 12,     // Cards, dialogs
  xl: 16,     // Large cards
  '2xl': 24,  // Pill buttons
  full: 9999, // Circles, avatar badges
};
```

### Usage Guidelines

| Component | Border Radius |
|-----------|---------------|
| Buttons | 8px (md) |
| Inputs | 8px (md) |
| Cards | 12px (lg) |
| Avatars | full (circle) |
| Badges | full (pill) |
| Dialogs/Modals | 12px (lg) |
| Tooltips | 8px (md) |

---

## Shadows

```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
  },
};
```

---

## Component Specifications

### Button Variants

#### Primary Button
```typescript
const primaryButton = {
  backgroundColor: colors.primary,
  color: colors.primaryForeground,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  minHeight: 40,
};
```

#### Secondary Button
```typescript
const secondaryButton = {
  backgroundColor: colors.secondary,
  color: colors.secondaryForeground,
  // Same padding/radius as primary
};
```

#### Outline Button
```typescript
const outlineButton = {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.foreground,
};
```

#### Ghost Button
```typescript
const ghostButton = {
  backgroundColor: 'transparent',
  color: colors.foreground,
};
```

#### Destructive Button
```typescript
const destructiveButton = {
  backgroundColor: colors.destructive,
  color: colors.destructiveForeground,
};
```

### Button Sizes

| Size | Height | Padding H | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| sm | 36px | 12px | 14px | 16px |
| default | 40px | 16px | 14px | 16px |
| lg | 44px | 24px | 16px | 20px |
| icon | 40x40px | 0 | - | 16px |

---

### Input Components

#### Text Input
```typescript
const textInput = {
  height: 40,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  fontSize: 16,
  color: colors.foreground,
  backgroundColor: colors.background,
};

// Focus state
const textInputFocused = {
  borderColor: colors.ring,
  borderWidth: 2,
};

// Error state
const textInputError = {
  borderColor: colors.destructive,
};
```

#### PIN Input
```typescript
const pinDigit = {
  width: 48,
  height: 56,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: colors.border,
  fontSize: 24,
  fontWeight: 'bold',
  textAlign: 'center',
};
```

---

### Card Component

```typescript
const card = {
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.sm,
};

const cardHeader = {
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginBottom: 12,
};

const cardTitle = {
  fontSize: 18,
  fontWeight: '600',
  color: colors.foreground,
};

const cardDescription = {
  fontSize: 14,
  color: colors.mutedForeground,
  marginTop: 4,
};
```

---

### Avatar Component

```typescript
const avatar = {
  sm: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  md: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  xl: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
};

const avatarFallback = {
  backgroundColor: colors.muted,
  justifyContent: 'center',
  alignItems: 'center',
};

const avatarFallbackText = {
  color: colors.mutedForeground,
  fontWeight: '500',
};
```

---

### Badge Component

```typescript
const badge = {
  paddingHorizontal: 10,
  paddingVertical: 2,
  borderRadius: 9999, // pill shape
  fontSize: 12,
  fontWeight: '500',
};

const badgeVariants = {
  default: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  },
  secondary: {
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
  },
  destructive: {
    backgroundColor: colors.destructive,
    color: colors.destructiveForeground,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
  },
  success: {
    backgroundColor: colors.success,
    color: colors.successForeground,
  },
  warning: {
    backgroundColor: colors.warning,
    color: colors.warningForeground,
  },
};
```

---

### Status Indicators

#### Clock Status Badge
```typescript
const clockedInBadge = {
  backgroundColor: 'hsl(142, 76%, 36%)', // green
  color: 'white',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 9999,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
};

const clockedOutBadge = {
  backgroundColor: colors.muted,
  color: colors.mutedForeground,
  // Same structure as above
};
```

---

## Icons

### Icon Library

Use Lucide icons for consistency with the web app:

```bash
npm install lucide-react-native
```

### Icon Sizes

| Context | Size |
|---------|------|
| Button icon | 16px |
| List item icon | 20px |
| Navigation icon | 24px |
| Feature icon | 32px |
| Empty state icon | 48px |

### Common Icons

| Purpose | Icon Name |
|---------|-----------|
| Clock in | `LogIn` |
| Clock out | `LogOut` |
| Break | `Coffee` |
| Camera | `Camera` |
| QR Scan | `QrCode` or `Scan` |
| Location | `MapPin` |
| Time | `Clock` |
| Calendar | `Calendar` |
| User | `User` |
| Settings | `Settings` |
| Check | `Check` |
| Close | `X` |
| Back | `ChevronLeft` |
| Forward | `ChevronRight` |
| Menu | `Menu` |
| More | `MoreVertical` |

---

## Touch Targets

### Minimum Sizes

Following iOS and Android accessibility guidelines:

```typescript
const touchTarget = {
  minWidth: 44,
  minHeight: 44,
};
```

### Interactive Elements

All buttons, links, and tappable elements should have:
- Minimum 44x44px touch target
- Visual feedback on press (opacity change or scale)
- Adequate spacing between targets

---

## Safe Areas

Handle notches, status bars, and home indicators:

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* Content */}
    </View>
  );
}
```

---

## Animations

### Transition Durations

```typescript
export const animation = {
  fast: 150,      // Quick micro-interactions
  normal: 200,    // Standard transitions
  slow: 300,      // Page transitions, modals
  spring: {
    damping: 15,
    stiffness: 150,
  },
};
```

### Common Animations

#### Button Press
```typescript
const buttonPressAnimation = {
  scale: 0.98,
  duration: 100,
};
```

#### Card Press
```typescript
const cardPressAnimation = {
  opacity: 0.7,
  duration: 100,
};
```

#### Modal Enter
```typescript
const modalEnterAnimation = {
  from: { opacity: 0, scale: 0.95 },
  to: { opacity: 1, scale: 1 },
  duration: 200,
};
```

#### Slide In
```typescript
const slideInAnimation = {
  from: { translateX: '100%' },
  to: { translateX: 0 },
  duration: 300,
  easing: 'ease-out',
};
```

---

## Screen Layout Templates

### Basic Screen
```typescript
function BasicScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16 }}>
        {/* Content */}
      </View>
    </SafeAreaView>
  );
}
```

### Screen with Header
```typescript
function ScreenWithHeader() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Title</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Tab Bar Layout
```typescript
const tabBarStyle = {
  height: 56,
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  flexDirection: 'row',
  paddingBottom: insets.bottom,
};

const tabItemStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
};

const tabIconActive = {
  color: colors.primary,
};

const tabIconInactive = {
  color: colors.mutedForeground,
};
```

---

## Responsive Breakpoints

While mobile apps don't have traditional breakpoints, consider:

```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device size categories
const isSmallDevice = width < 375;   // iPhone SE, etc.
const isMediumDevice = width >= 375 && width < 414;
const isLargeDevice = width >= 414;  // iPhone Pro Max, tablets

// Orientation
const isLandscape = width > height;
```

---

## Dark Mode Implementation

```typescript
import { useColorScheme } from 'react-native';

function useTheme() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? colors.dark : colors.light;
}

// Usage
function Component() {
  const theme = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.foreground }}>Hello</Text>
    </View>
  );
}
```

---

## Accessibility

### Text Scaling

Respect user's text size preferences:

```typescript
import { Text } from 'react-native';

// Allow text scaling
<Text allowFontScaling={true}>Scalable Text</Text>

// Limit maximum scale for layout-critical text
<Text maxFontSizeMultiplier={1.3}>Limited Scaling</Text>
```

### Screen Reader Labels

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Clock in to start your shift"
  accessibilityRole="button"
>
  <Text>Clock In</Text>
</TouchableOpacity>
```

### Reduced Motion

```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

// Use simpler animations when reduce motion is enabled
const animationDuration = reduceMotion ? 0 : 200;
```

---

## Complete Theme Object

```typescript
// theme.ts
export const theme = {
  colors: {
    light: { /* ... */ },
    dark: { /* ... */ },
  },
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  borderRadius,
  shadows,
  animation,
};

export type Theme = typeof theme;
```

This complete design system ensures visual consistency between the web and mobile applications while following platform-specific conventions.
