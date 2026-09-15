# Messaging Hooks

Hooks that sit on top of the messaging context/reducer (`../MessageContext.ts`,
`../state/`) and shape state for a specific consumer. There is no barrel
`index.ts` here — each file is imported directly by its consumer.

## Files

- **`useModelPanel.ts`** — the main hook behind `ModelPanel`. Reads selection,
  validation and app-init state from `useMessaging()`, transforms the
  selected element into `ExtendedModelItemData`, and returns the data/actions
  `ModelPanel.tsx` renders (`onElementUpdate`, `onElementTypeChange`,
  `onValidate`, `onRemoveModel`, etc).
- **`useSendMessage.ts`** — builds and posts a single envelope
  (`{ id, type, source, target, version, data }`) to the parent window,
  picking the message `source` from the current panel type.
- **`useValidationState.ts`** — derives errors/warnings/infos counts from the
  validation slice; used by `StudiesLaunchButton.tsx` to gate the Studies
  launch button on outstanding validation errors.

Tests live in `__tests__/`.
