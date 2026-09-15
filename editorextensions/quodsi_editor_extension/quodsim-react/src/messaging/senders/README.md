# Message Senders

Hooks for sending messages from the React panel to the LucidChart extension
host. There is no barrel `index.ts` — each file is imported directly by its
consumer.

## Files

- **`useSender.ts`** — the base hook every other sender wraps: posts an
  envelope via `useSendMessage`/the messaging context.
- **`authSender.ts`** — `useAuthSender`: `requestAuth` (triggers the Kinde
  OAuth flow in the extension) and logout.
- **`modelOpsSender.ts`** — `useModelOpsSender`: model/element operations —
  validate, convert, remove model, update element data, convert element,
  convert page, update resource requirements, update element (confirmed
  round trip), request model JSON, select element, locate element.
- **`portalSender.ts`** — `usePortalSender`: one-shot RPC to open the Kinde
  billing portal, correlated by envelope id.
- **`simulationSender.ts`** — `useSimulationSender`: send a `MODEL_RUN_REQUEST`.
- **`simulationRunSender.ts`** — `useSimulationRunSender`: opens the Studies,
  Diagram Mapping, Status, Pattern, Schedule, Settings and Advisor modals,
  plus auto-convert-page.
- **`upgradeInterestSender.ts`** — `useUpgradeInterestSender`: fire-and-forget
  "contact sales" ping used by PlanDetails, correlated by envelope id like
  `portalSender`.

Tests live in `__tests__/` (plus `upgradeInterestSender.test.tsx` alongside
the source).
