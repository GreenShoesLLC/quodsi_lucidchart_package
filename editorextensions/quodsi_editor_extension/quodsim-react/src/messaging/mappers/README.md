# Message Mappers

Transform incoming envelope messages from the host into reducer actions.
There is no barrel `index.ts` — `mapEnvelopeToAction.ts` imports each mapper
directly, and other consumers import mapper functions by file path.

## Files

- **`mapEnvelopeToAction.ts`** — the dispatcher: tries each category mapper
  in order (`mapFramework`, `mapAuth`, `mapSelection`, `mapSimulation`,
  `mapModelOps`, `mapEntitlements`) and returns the first non-null action.
- **`framework.mapper.ts`** — core protocol messages (`REACT_APP_READY`,
  `ERROR`, `LOG`).
- **`auth.mapper.ts`** — authentication status messages.
- **`selection.mapper.ts`** — selection/document-context updates.
- **`simulation.mapper.ts`** — simulation run status.
- **`modelOps.mapper.ts`** — model operations (validate, convert, remove, etc).
- **`modelItem.mapper.ts`** — transforms a selected element's raw shape data
  into `ExtendedModelItemData` (used by `useModelPanel`, not by
  `mapEnvelopeToAction`).
- **`entitlements.mapper.ts`** — plan/entitlements updates.
- **`validation.mapper.ts`** — transforms a validation result payload into
  `ValidationResult` (`transformToValidationState`), consumed by
  `useModelPanel`.

Tests live alongside the mapper (`entitlements.mapper.test.ts`) or in the
directory's own test files.
