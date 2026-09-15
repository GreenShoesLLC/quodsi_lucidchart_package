# Quodsi React Messaging System

Client-side messaging infrastructure for the Quodsi React panel. It manages
the `postMessage` protocol between the React app (running in a LucidChart
panel iframe) and the LucidChart editor extension host, and holds the
reducer-based state that protocol produces.

There is a single, always-on model panel today — the standalone auth panel
and results panel were removed, so despite some lingering `'auth'` /
`'results'` values in the panel-type union (see
`effects/initializationEffects.ts`), no route in `App.tsx` renders them.

## Directory contents

```
messaging/
├── MessageContext.ts     # React Context + hooks: useMessaging, useMessagingDispatch,
│                          # useSelection, useSimulation, useValidation, useAuth,
│                          # useEntitlements
├── MessageProvider.tsx    # Provider component; wires effects + the reducer + context
├── initializeMessaging.ts # One-time logger/devtools setup, called from index.tsx
├── index.ts               # Re-exports only what's imported through this barrel
│                           # (currently: useMessaging)
│
├── hooks/                 # See hooks/README.md
├── effects/                # useEffect implementations used by MessageProvider
│   ├── initializationEffects.ts  # usePanelTypeDetectionEffect (panel type from URL)
│   ├── reactAppReadyEffects.ts   # useReactAppReadyEffect (sends REACT_APP_READY once)
│   ├── messageListenerEffect.ts  # useMessageListenerEffect (wires window 'message')
│   └── index.ts
├── handlers/               # rxMessageHandlers.ts: turns a raw MessageEvent into a
│   │                        # mapped action and dispatches it (dedupes by message id)
│   └── index.ts
├── senders/                # See senders/README.md
├── mappers/                 # See mappers/README.md
└── state/                   # See state/README.md
```

## Message lifecycle

1. **Outgoing (React → host)**: a component calls a sender hook
   (`senders/`), which builds an envelope and posts it via `useSender`.
2. **Incoming (host → React)**: the host posts a message; `messageListenerEffect`
   picks it up, `rxMessageHandlers.ts` deduplicates it by id and calls
   `mapEnvelopeToAction` (`mappers/`), and the resulting action is dispatched
   into the reducer (`state/`). Components read the new state through the
   context hooks in `MessageContext.ts`.

## Debugging

Use the shared, level-based logger — not `console.*` directly:

```typescript
import { getLogger } from '@quodsi/lucid-shared';
const log = getLogger('YourComponent');
log.debug('...');
```

`npm run lint:hooks` enforces `no-console` as part of the deploy gate.
Namespace levels are configured once in `src/index.tsx`.
