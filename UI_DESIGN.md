# UI Design System - SmartHomeApp

## 🎨 Design Philosophy

The SmartHomeApp uses a **premium, minimal, and consumer-friendly** design language focused on:

- **Clarity** - Clean interfaces with clear hierarchy
- **Sophistication** - Frosted glass effects and soft shadows
- **Accessibility** - Large touch targets, readable text
- **Real-time Feedback** - Immediate visual response to user actions
- **Intentional Spacing** - Breathing room between elements

## 🎯 Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Blue** | #3B82F6 | Primary actions, icons, active states |
| **Green** | #10B981 | Success, online status, active devices |
| **Red** | #EF4444 | Destructive actions, errors, logout |
| **Amber** | #F59E0B | Warnings, alerts |

### Neutral Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Dark Gray** | #111827 | Primary text, headings |
| **Medium Gray** | #6B7280 | Secondary text |
| **Light Gray** | #9CA3AF | Tertiary text, disabled states |
| **Very Light Gray** | #D1D5DB | Borders, dividers |
| **Background** | #F4F7FB | Screen background |
| **White** | #FFFFFF | Card backgrounds |

### Semantic Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Online** | #10B981 | Device online indicator |
| **Offline** | #9CA3AF | Device offline indicator |
| **Active** | #10B981 | Device turned ON |
| **Idle** | #D1D5DB | Device turned OFF |

## 📐 Typography

### Font Sizes

| Size | Usage |
|------|-------|
| **32px** | Screen titles (bold 800) |
| **18px** | Section headers (bold 700) |
| **16px** | Card titles, primary text (bold 700) |
| **15px** | Menu items, body text (bold 600) |
| **14px** | Secondary text (regular 500) |
| **13px** | Tertiary text, subtitles (regular 400) |
| **12px** | Labels, captions (regular 500) |
| **11px** | Small labels, timestamps (regular 500) |

### Font Weights

- **800** - Screen titles (maximum emphasis)
- **700** - Section headers, card titles
- **600** - Menu items, important text
- **500** - Body text, labels
- **400** - Secondary text, descriptions

## 🎴 Card Styling

### Premium Card (Main Content)

```typescript
{
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 24,
  padding: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 6,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.5)',
}
```

**Features:**
- Frosted glass effect with subtle white border
- Soft shadow for depth
- Rounded corners (24px) for premium feel
- Generous padding (20px)

### Standard Card (Menu Items)

```typescript
{
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.5)',
}
```

**Features:**
- Minimal shadow for subtle depth
- Smaller border radius (16px)
- Compact padding for list items

### Icon Container

```typescript
{
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  justifyContent: 'center',
  alignItems: 'center',
}
```

**Features:**
- Light blue background (10% opacity)
- Rounded square (12px radius)
- Perfect for icon display

## 🎬 Component Patterns

### Menu Item Structure

```
┌─────────────────────────────────────┐
│ [Icon] Title              [Chevron] │
│        Subtitle                     │
└─────────────────────────────────────┘
```

- Icon: 44x44px with light blue background
- Title: 15px, bold 600, dark gray
- Subtitle: 12px, regular 400, light gray
- Chevron: 20px, light gray

### Status Chip

```
┌──────────────────┐
│ • On (3 devices) │
└──────────────────┘
```

- Dot: 6px, colored (green/blue/gray)
- Text: 12px, bold 600
- Background: 10% opacity of dot color
- Padding: 12px horizontal, 8px vertical
- Border radius: 20px

### Device Card (2-Column Grid)

```
┌──────────────────┐
│ [Icon Container] │
│                  │
│ Device Name      │
│ Room Name        │
│                  │
│ ON/OFF [Toggle]  │
└──────────────────┘
```

- Width: 48% (2-column layout)
- Min height: 200px
- Icon: 28px in 56x56px container
- Name: 15px, bold 700
- Room: 12px, regular 500
- State: 14px, bold 700

## 🎨 Live Activity Empty State

### Design

```
┌─────────────────────────────────┐
│                                 │
│         [Activity Icon]         │
│                                 │
│    Everything is quiet          │
│  Device events will appear here │
│                                 │
│    • Monitoring 1 device        │
│                                 │
└─────────────────────────────────┘
```

### Styling

- Icon container: 48x48px, white background, no shadow
- Icon: 24px, red (#EF4444)
- Primary text: 16px, bold 600, medium gray
- Secondary text: 13px, regular 400, light gray
- Monitoring dot: 4px, dynamic color (green if online, grey if offline)
- Monitoring text: 11px, regular 500, light gray

## 🎯 Interactive Elements

### Buttons

**Primary Button**
- Background: #3B82F6
- Text: White, bold 600
- Padding: 12px vertical, 16px horizontal
- Border radius: 12px

**Secondary Button**
- Background: #F3F4F6
- Text: #1F2937, bold 600
- Padding: 12px vertical, 16px horizontal
- Border radius: 12px

**Destructive Button**
- Background: rgba(239, 68, 68, 0.1)
- Text: #EF4444, bold 600
- Padding: 12px vertical, 16px horizontal
- Border radius: 12px

### Switches

- Track (off): #E5E7EB
- Track (on): #86EFAC
- Thumb (off): #9CA3AF
- Thumb (on): #10B981

### Input Fields

- Border: 1px #E5E7EB
- Border radius: 12px
- Padding: 12px horizontal, 12px vertical
- Font size: 14px
- Placeholder color: #9CA3AF

## 🎬 Animations

### Entry Animation

- Fade in: 600ms
- Slide up: 30px → 0px, 600ms
- Easing: Default (ease-in-out)

### Transitions

- Screen transitions: 300ms
- Button press: 100ms opacity change
- Toggle switch: 200ms
- Card interactions: 150ms

### Micro-interactions

- Icon button press: 0.85 opacity
- Card press: 0.85 opacity
- Long press: 500ms delay before menu

## 📱 Spacing System

### Padding

- **4px** - Tiny spacing (badges, small gaps)
- **8px** - Small spacing (internal card spacing)
- **12px** - Medium spacing (section gaps)
- **16px** - Large spacing (screen padding, card padding)
- **20px** - Extra large spacing (premium card padding)

### Gaps

- **4px** - Tight grouping
- **6px** - Icon + text
- **8px** - Menu items
- **10px** - Section items
- **12px** - Major sections
- **16px** - Screen sections

## 🎨 Dark Mode (Future)

When dark mode is implemented:

- Background: #1F2937
- Cards: #111827
- Text: #F3F4F6
- Borders: rgba(255, 255, 255, 0.1)
- Shadows: rgba(0, 0, 0, 0.3)

## 📐 Responsive Design

### Screen Sizes

- **Small** (< 360px): Single column, reduced padding
- **Medium** (360-480px): 2-column grid, standard padding
- **Large** (> 480px): 2-column grid, generous padding

### Safe Area

- Top: Status bar height + 16px
- Bottom: Navigation bar height + 16px
- Horizontal: 16px padding on all screens

## 🎯 Accessibility

### Touch Targets

- Minimum: 44x44px (buttons, icons)
- Recommended: 48x48px (interactive elements)
- Spacing: 8px minimum between targets

### Text Contrast

- Primary text: #111827 on #FFFFFF (21:1 ratio)
- Secondary text: #6B7280 on #FFFFFF (7:1 ratio)
- All text meets WCAG AA standards

### Font Sizes

- Minimum: 12px for captions
- Body text: 14px minimum
- Headings: 16px minimum

## 🔄 Component Library

### Reusable Components

- **MenuItemCard** - Icon + title + subtitle + chevron
- **StatusChip** - Dot + label with dynamic colors
- **DeviceCard** - Device display with toggle
- **EmptyState** - Icon + title + subtitle
- **IconButton** - Rounded square button with icon
- **PremiumCard** - Frosted glass container

## 📚 Design Resources

- **Color Tool:** https://www.tailwindcss.com/
- **Typography:** Inter font family (system default)
- **Icons:** Feather Icons (react-native-vector-icons)
- **Shadows:** Material Design elevation system

---

**Last Updated:** May 2026  
**Version:** 1.0.0  
**Status:** Complete
