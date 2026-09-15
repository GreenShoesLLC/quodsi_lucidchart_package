# Messaging State Management

A small Redux-style reducer, combining one slice per domain.

## Files

```
state/
├── appSlice.ts           # App init + detected panel type
├── authSlice.ts          # Authentication status
├── selectionSlice.ts     # Element selection + document context
├── simulationSlice.ts    # Simulation run status
├── validationSlice.ts    # Model validation results
├── entitlementsSlice.ts  # Plan/entitlements (usage limits, trial)
├── rootReducer.ts        # Combines the slices into MessagingState/messagingReducer
├── types.ts              # MessagingAction union + a couple of re-exported shared types
└── index.ts              # Re-exports everything above (consumed via `../state`
                           # from messaging/index.ts and MessageContext.ts)
```

Each slice follows the same shape: a `*State` interface, an `initial*State`
value, a `*Action` union, and a pure `*Reducer(state, action)` function.

## Usage

```typescript
import { messagingReducer, initialState, MessagingState, MessagingAction } from './state';
```

Actions reach the reducer via `mappers/mapEnvelopeToAction.ts` (host →
React) or directly from sender hooks that need optimistic/local state.
Components read state through the context hooks in `../MessageContext.ts`
(`useAuth`, `useSelection`, `useSimulation`, `useValidation`,
`useEntitlements`).

## Adding new state or actions

1. Add to or create a slice file, following the existing pattern.
2. Add the slice's action type to the `MessagingAction` union in `types.ts`.
3. Wire the slice into `rootReducer.ts` (state field + reducer call).
