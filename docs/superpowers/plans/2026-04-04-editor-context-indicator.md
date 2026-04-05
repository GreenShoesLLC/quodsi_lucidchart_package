# Editor Context Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a colored accent stripe on the PanelHeader and a fade transition between editor types so users can immediately identify which editor context they're in.

**Architecture:** A shared color map defines accent colors per `SimulationObjectType`. The `PanelHeader` component receives the editor type and renders a left border in the corresponding color. The `ElementEditor` wrapper tracks editor type changes and applies a CSS opacity transition on switch.

**Tech Stack:** React 18, Tailwind CSS, lucide-react icons (existing stack — no new dependencies)

**Spec:** `docs/superpowers/specs/2026-04-04-editor-context-indicator-design.md`

---

### Task 1: Create Editor Color Constants

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/constants/editorColors.ts`

- [ ] **Step 1: Create the color map file**

```typescript
// editorColors.ts
import { SimulationObjectType } from "@quodsi/shared";

/**
 * Accent colors for each editor type, used for the PanelHeader left border stripe.
 * Values are Tailwind border-color classes.
 */
export const EDITOR_ACCENT_COLORS: Record<string, string> = {
  [SimulationObjectType.Model]: "border-blue-500",
  [SimulationObjectType.Activity]: "border-amber-500",
  [SimulationObjectType.Generator]: "border-cyan-500",
  [SimulationObjectType.Resource]: "border-green-500",
  [SimulationObjectType.Entity]: "border-purple-500",
  [SimulationObjectType.Connector]: "border-gray-400",
};

/**
 * Returns the Tailwind border-color class for a given editor type.
 * Falls back to transparent if the type is unknown.
 */
export function getEditorAccentClass(editorType: string | SimulationObjectType): string {
  return EDITOR_ACCENT_COLORS[editorType] || "border-transparent";
}
```

- [ ] **Step 2: Verify file compiles**

Run from `quodsim-react/`:
```bash
npx tsc --noEmit src/constants/editorColors.ts
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/constants/editorColors.ts
git commit -m "feat: add editor accent color constants"
```

---

### Task 2: Add Accent Stripe to PanelHeader

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx`

- [ ] **Step 1: Add import for color utility**

At the top of `PanelHeader.tsx`, add:

```typescript
import { getEditorAccentClass } from "../../constants/editorColors";
```

- [ ] **Step 2: Add `editorType` prop to PanelHeaderProps**

In the `PanelHeaderProps` interface (line 14), add a new prop:

```typescript
interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ExtendedModelItemData | null;
  editorType: string;  // ADD THIS — SimulationObjectType value for accent stripe
  onRemoveModel?: () => void;
  // ... rest unchanged
}
```

- [ ] **Step 3: Destructure the new prop**

In the component function signature (line 32), add `editorType` to the destructured props:

```typescript
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  modelName,
  validationState,
  currentElement,
  editorType,  // ADD THIS
  onRemoveModel,
  // ... rest unchanged
}) => {
```

- [ ] **Step 4: Apply accent stripe to the header container**

Change the header container div (line 324) from:

```tsx
<div className="p-2 border-b bg-gray-50 shadow-sm space-y-2">
```

to:

```tsx
<div className={`p-2 border-b bg-gray-50 shadow-sm space-y-2 border-l-[3px] ${getEditorAccentClass(editorType)}`}>
```

- [ ] **Step 5: Verify the React dev server compiles without errors**

The app won't fully work yet (parent doesn't pass `editorType` prop), but check there are no TypeScript errors in PanelHeader itself. If the dev server is running, it should hot-reload — check browser console for compilation errors.

- [ ] **Step 6: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx
git commit -m "feat: add accent stripe to PanelHeader via editorType prop"
```

---

### Task 3: Pass editorType from Parent to PanelHeader

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx`

`ModelPanel.tsx` renders `<PanelHeader>` at line 279. It already has `currentElement` in scope.

- [ ] **Step 1: Add import for SimulationObjectType (if not already imported)**

Check if `SimulationObjectType` is already imported. If not, add:

```typescript
import { SimulationObjectType } from "@quodsi/shared";
```

- [ ] **Step 2: Derive the editor type**

Before the return statement (around line 277), add:

```typescript
// Derive editor type for accent stripe
const editorType = !currentElement ||
  (currentElement.metadata?.type as SimulationObjectType) === SimulationObjectType.Model
    ? SimulationObjectType.Model
    : (currentElement.metadata?.type as SimulationObjectType) || SimulationObjectType.Model;
```

- [ ] **Step 3: Pass editorType to PanelHeader**

Change the `<PanelHeader>` JSX (line 279) to include the new prop:

```tsx
{!isSwimLane && <PanelHeader
  modelName={modelName}
  validationState={validationState}
  currentElement={currentElement}
  editorType={editorType}
  // ... rest of existing props unchanged
/>}
```

- [ ] **Step 4: Verify in browser**

Open the Quodsi panel in LucidChart test mode. You should see:
- Blue stripe on left edge of header when no element is selected (Model)
- Amber stripe when selecting an Activity shape
- Green stripe when selecting a Resource shape
- The stripe should be 3px wide, visually distinct against the gray-50 header

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx
git commit -m "feat: pass editorType prop to PanelHeader for accent stripe"
```

---

### Task 4: Add Fade Transition to ElementEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`

- [ ] **Step 1: Add state tracking for editor type changes**

At the top of the `ElementEditor` component function (after the destructured props, around line 63), add:

```typescript
import { SimulationObjectType } from "@quodsi/shared";
import { getSimulationObjectType } from "../../utils/typeDetection";

// ... inside the component:

// Track editor type for fade transition
const [isTransitioning, setIsTransitioning] = useState(false);
const previousEditorTypeRef = useRef<string | null>(null);

// Determine current editor type
const currentEditorType = elementData?.className === 'AdvancedSwimLaneBlock'
  ? 'SwimLane'
  : getSimulationObjectType(elementType, currentElement, elementData);
```

Note: `useState` and `useRef` need to be imported from React (already imported in the file).

- [ ] **Step 2: Add effect to detect editor type changes and trigger fade**

After the state declarations, add:

```typescript
useEffect(() => {
  if (previousEditorTypeRef.current !== null && previousEditorTypeRef.current !== currentEditorType) {
    // Editor type changed — trigger fade
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 200);
    return () => clearTimeout(timer);
  }
  previousEditorTypeRef.current = currentEditorType;
}, [currentEditorType]);

// Update ref after transition completes
useEffect(() => {
  if (!isTransitioning) {
    previousEditorTypeRef.current = currentEditorType;
  }
}, [isTransitioning, currentEditorType]);
```

- [ ] **Step 3: Apply transition styles to the wrapper div**

Change the return statement (line 263-266) from:

```tsx
return (
  <div className="bg-white">
    {editorContent}
  </div>
);
```

to:

```tsx
return (
  <div
    className="bg-white transition-opacity duration-200 ease-in-out"
    style={{ opacity: isTransitioning ? 0 : 1 }}
  >
    {editorContent}
  </div>
);
```

- [ ] **Step 4: Verify in browser**

Test by clicking between different element types in LucidChart:
- Click an Activity shape → click a Resource shape: should see brief fade
- Click Activity A → click Activity B: should NOT fade (same editor type)
- Click an Activity → click empty canvas (Model): should fade
- First load: should NOT fade

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx
git commit -m "feat: add fade transition between editor type changes"
```

---

### Task 5: Visual QA and Polish

**Files:**
- Possibly modify: `PanelHeader.tsx`, `ElementEditor.tsx`, `editorColors.ts`

- [ ] **Step 1: Test all editor types**

Verify accent stripe colors for each editor type:
- Model (no selection): blue stripe
- Activity: amber stripe
- Generator: cyan stripe
- Resource: green stripe
- Entity: purple stripe
- Connector (line selection): gray stripe

- [ ] **Step 2: Test edge cases**

- Unconverted elements (new shapes not yet assigned a type): should show some reasonable default
- SwimLane blocks: decide if they need a color or use the fallback (transparent)
- Rapid clicking between elements: fade should not stack or glitch

- [ ] **Step 3: Verify Renee's constraint**

Confirm the colors are subtle and not obnoxious:
- The stripe is only 3px wide on the header
- No background tints on the panel body
- Colors are Tailwind 500-weight (medium saturation, not neon)

- [ ] **Step 4: Fix any issues found**

Address any visual or behavioral issues discovered in steps 1-3.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "polish: editor context indicator QA fixes"
```
