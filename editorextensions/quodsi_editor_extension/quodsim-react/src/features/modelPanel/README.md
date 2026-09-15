# Model Panel

The always-on model panel: the container and chrome around the shared
Studio editors.

## Files

- **`ModelPanel.tsx`** — top-level container. Uses `useModelPanel` for
  selection/document/validation state, renders `AccountStrip`, `PanelHeader`,
  `ElementEditor`, and the `ModelDefinitionViewer` modal; owns the
  initialization/loading/unconverted-page states. An unconverted page renders
  the shared `BlankSlateConverter` (driven by `useLucidBlankSlateAccessor`)
  instead of `ElementEditor`. Wraps its content in the shared
  `HostAdvisorProvider` (enabled while signed in), which the shared editor
  headers and the blank-slate card use for their Advisor button.
- **`PanelHeader.tsx`** — model/element header: icon, name, accent stripe,
  type selector, and the "..." overflow menu (Diagram Mapping, View Model
  JSON, Developer Tools, Status, Settings, About, Remove Quodsi Model).
- **`ElementEditor.tsx`** — dispatches to the right editor for the selected
  element's type (the shared Studio Activity/Generator/Model editors via
  their `Lucid*Editor` wrappers, `ResourceBlockEditor`, `SwimLaneEditor`,
  `ConnectorRoutingView`).
- **`ModelDefinitionViewer.tsx`** — modal that shows the host-built model
  JSON (requested via `MODEL_JSON_REQUEST`/`MODEL_JSON_RESPONSE`).
- **`StudiesLaunchButton.tsx`** — opens the Studies modal; disabled when
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
