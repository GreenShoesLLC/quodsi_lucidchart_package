# Editor Context Indicator

## Problem

The Quodsi editor panel (300px right-side panel in LucidChart) swaps its content based on the user's selection — Model, Activity, Generator, Resource, Entity, or Connector editor. Early adopter feedback: users don't notice when the panel switches context, especially when returning to the Model editor. The current visual cues (a small icon and name in the header) are too subtle.

## Solution

Two complementary visual signals:

1. **Accent stripe** — a persistent colored bar on the PanelHeader that tells you "where you are"
2. **Fade transition** — a brief opacity animation that tells you "something just changed"

## Accent Stripe

- **Position**: Left edge of the PanelHeader only (not the full panel height)
- **Width**: 3px
- **Always visible** while that editor is active
- **Colors per editor type**:

| Editor | Color | Tailwind Class |
|--------|-------|---------------|
| Model | Blue | `blue-500` |
| Activity | Amber | `amber-500` |
| Generator | Cyan | `cyan-500` |
| Resource | Green | `green-500` |
| Entity | Purple | `purple-500` |
| Connector | Gray | `gray-400` |

## Fade Transition

- **Trigger**: Only when the editor *type* changes (e.g., Model to Activity, or Activity to Connector)
- **Does NOT trigger**: When selecting a different element of the same type (e.g., Activity A to Activity B)
- **Duration**: ~200ms total (100ms fade-out, 100ms fade-in)
- **Mechanism**: Panel content opacity transitions from 1 → 0, new editor renders, then 0 → 1
- **First render**: No fade on initial panel load — only on subsequent editor type changes

## What Stays the Same

- No background tints on the panel body or content area
- No changes to tab styling, form fields, or button styling
- Existing icon colors in PanelHeader (blue for Model, orange for elements) remain unchanged
- No changes to the editor components themselves — this is purely a wrapper-level change

## Implementation Notes

- The accent stripe can be implemented as a `border-left` or `::before` pseudo-element on the PanelHeader, with the color passed as a prop based on editor type
- The fade transition should wrap the editor content in `ElementEditor.tsx` (or equivalent routing component) and track the previous editor type to detect type changes
- Color mapping should be defined in a single shared constant (e.g., `EDITOR_TYPE_COLORS`) for consistency
