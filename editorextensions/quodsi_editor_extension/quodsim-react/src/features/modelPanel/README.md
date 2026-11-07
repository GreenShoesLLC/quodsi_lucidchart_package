# Model Panel

The always-on model panel: the container and chrome around the shared
Studio editors.

## Files

- **`ModelPanel.tsx`** — top-level container. Uses `useModelPanel` for
  selection/document/validation state, renders `AccountStrip`, `PanelHeader`,
  and `ElementEditor`; owns the
  initialization/loading/unconverted-page states. An unconverted page renders
  the shared `BlankSlateConverter` (driven by `useLucidBlankSlateAccessor`)
  instead of `ElementEditor`. Wraps its content in the shared
  `HostAdvisorProvider` (enabled while signed in), which the header's launch
  bar and the blank-slate card use for their Advisor button.
- **`PanelHeader.tsx`** — host toolbar above the editor. Its first row, in
  every view (swimlanes too), is the shared `PanelLaunchBar`, as in drawio:
  the Advisor (the panel's only Advisor button; it consults on the selected
  element, or opens the project when none is), What-if Analysis and, in
  developer mode, the Developer Tools button (five clicks on the Status
  window's version line turn developer mode on or off). An element view adds
  the type selector below it. Diagram Mapping,
  Status, Take the Tour and Remove Quodsi Model are in the extension's Quodsi menu
  (`src/core/quodsiMenu.ts`, carried out by `features/menu/MenuCommandHost`);
  Settings is the account strip's gear. Icon, name, accent stripe and type
  label are the shared editor's `EditorHeader`'s; only the unconverted view
  (which mounts no editor) keeps a title and instruction.
- **`ElementEditor.tsx`** — dispatches to the right editor for the selected
  element's type (the shared Studio Activity/Generator/Model editors via
  their `Lucid*Editor` wrappers, `ResourceBlockEditor`, `SwimLaneEditor`,
  `ConnectorRoutingView`).
- **`useLucidStudiesLaunch.ts`** — what Lucid feeds the launch bar's
  What-if button: opens the Studies modal; disabled when
  signed out or when validation has outstanding errors.
- **`useModelEditorTab.ts`** — holds the Model editor's active tab across
  `ElementEditor`'s page-keyed remounts, and applies a pending tab set by
  `utils/pendingNavigation.ts`.
- **`index.ts`** — re-exports `ModelPanel` (the only name imported through
  this barrel elsewhere).

## Usage

```tsx
import { ModelPanel } from '../features/modelPanel';
```

Tests live in `__tests__/`.
