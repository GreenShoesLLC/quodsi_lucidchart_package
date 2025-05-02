# MessageProvider & Client‑side Messaging Layer

This document describes the **MessageProvider** React component that lives inside QReact (AuthPanel / ModelPanel) and mediates all postMessage traffic between the iframe and the Quodsi extension host (Qext).  It also defines the supporting types, hooks, and design decisions that keep the codebase type‑safe yet easy to evolve.

> *All payload interfaces referenced here come from the shared `quodsi-messaging` package.*

---

## 1  Purpose & Responsibilities

| # | Responsibility      | Detail                                                                                                                  |
| - | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1 | **Handshake**       | Emit `REACT_APP_READY` once MSAL/AuthProvider resolves the initial auth state.                                          |
| 2 | **Listener**        | Attach a single `window.addEventListener('message', …)`; validate envelopes and dispatch them to a reducer.             |
| 3 | **Outbound API**    | Expose typed helper functions (`requestRun`, `convertDiagram`, …) that build envelopes and `parent.postMessage()` them. |
| 4 | **Queueing**        | Buffer outgoing envelopes until the host acknowledges readiness (prevents race conditions on first load).               |
| 5 | **State store**     | Maintain frame‑local slices (auth, subscription, selection, runJobs, modelOps) via `useReducer`.                        |
| 6 | **Context**         | Provide hooks (`useRunJobs()`, `useSelection()`, …) so UI components stay hook‑driven, no prop drilling.                |
| 7 | **Dev Diagnostics** | When `process.env.NODE_ENV === "development"`, mirror every envelope to `window.__msgLog` for console inspection.       |

---

## 2  File Layout

```
src/
└─ messaging/
   ├─ MessageProvider.tsx      # implementation
   ├─ state.ts                 # State interface + initial state
   ├─ reducer.ts               # main reducer (switch on msg.type)
   ├─ hostSender.ts            # typed envelope builders & send()
   └─ hooks/
       ├─ useRunJobs.ts
       ├─ useSelection.ts
       └─ … (per slice)
```

---

## 3  Key Types

```ts
// state.ts
import { SelectedItem, ValidationItem, UserInfo } from "quodsi-messaging";

export interface RunJobEntry {
  jobId: string;
  state: "queued" | "running" | "completed" | "failed" | "canceled";
  percent: number;
  etaSeconds?: number;
  resultUrl?: string;
  errorMsg?: string;
}

export interface AppState {
  auth: {
    isAuthenticated: boolean;
    user?: UserInfo;
    requiredReason?: "not_authenticated" | "session_expired";
  };
  subscription: {
    tier: "free" | "pro" | "enterprise";
    status: "active" | "in_grace" | "expired";
    featureFlags: Record<string, boolean>;
  };
  selection: SelectedItem[];
  runJobs: Record<string, RunJobEntry>; // keyed by jobId
  modelOps: {
    lastValidation?: ValidationItem[];
    convertState?: "idle" | "running" | "success" | "failed";
  };
}

export const initialState: AppState = {
  auth: { isAuthenticated: false },
  subscription: { tier: "free", status: "active", featureFlags: {} },
  selection: [],
  runJobs: {},
  modelOps: {},
};
```

---

## 4  Reducer Highlights (`reducer.ts`)

```ts
import { AppState } from "./state";
import { QuodsiMessage, MessageTypes } from "quodsi-messaging";

export function reducer(state: AppState, msg: QuodsiMessage): AppState {
  switch (msg.type) {
    case MessageTypes.AUTH_STATUS:
      return { ...state, auth: {
        isAuthenticated: msg.data.isAuthenticated,
        user: msg.data.user,
      }};
    case MessageTypes.SUBSCRIPTION_STATUS:
      return { ...state, subscription: { ...msg.data } };
    case MessageTypes.SELECTION_CHANGED:
      return { ...state, selection: msg.data.selected };
    case MessageTypes.MODEL_RUN_ACK:
      return { ...state, runJobs: {
        ...state.runJobs,
        [msg.data.jobId]: { jobId: msg.data.jobId, state: "queued", percent: 0 },
      }};
    case MessageTypes.MODEL_RUN_STATUS:
      return { ...state, runJobs: {
        ...state.runJobs,
        [msg.data.jobId]: { ...state.runJobs[msg.data.jobId], ...msg.data },
      }};
    /* …additional cases for modelOps… */
    default:
      return state;
  }
}
```

The reducer is **type‑safe** because `msg` is the master union `QuodsiMessage` generated from the shared messaging package.

---

## 5  MessageProvider Component (outline)

```tsx
export const MessageProvider: React.FC<{
  panelRole: "auth" | "model";
  children: React.ReactNode;
}> = ({ panelRole, children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const readyRef = useRef(false);

  // outbound queue until host sends first AUTH_STATUS / MODEL_CONTEXT
  const outboundQueue = useRef<Envelope[]>([]);

  /* ---------- SEND helper ---------- */
  const send = useCallback((env: Envelope) => {
    if (!readyRef.current) outboundQueue.current.push(env);
    else parent.postMessage(env, "*");
  }, []);

  /* ---------- hostSender API exported via context ---------- */
  const api = useHostSender(panelRole, send);

  /* ---------- attach listener ---------- */
  useEffect(() => {
    function onMsg(e: MessageEvent<unknown>) {
      if (!isEnvelope(e.data)) return;
      const env = e.data;
      dispatch(env as QuodsiMessage);

      if (!readyRef.current && env.type === MessageTypes.MODEL_CONTEXT) {
        readyRef.current = true;
        outboundQueue.current.forEach(m => parent.postMessage(m, "*"));
        outboundQueue.current.length = 0;
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* ---------- send REACT_APP_READY once auth known ---------- */
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    const ready = buildReactAppReady(panelRole, isAuthenticated, user);
    parent.postMessage(ready, "*");
  }, []); // run once!

  return (
    <MessageContext.Provider value={{ state, ...api }}>
      {children}
    </MessageContext.Provider>
  );
};
```

*Details omitted for brevity; entire file lives at `src/messaging/MessageProvider.tsx`.*

---

## 6  Hooks per slice (`hooks/useRunJobs.ts`)

```ts
export function useRunJobs() {
  return useContext(MessageContext).state.runJobs;
}
```

UI components import these narrow hooks instead of ploughing through the entire context object.

---

## 7  Envelope Builders (`hostSender.ts`)

```ts
export function buildRunRequest(docId: string, pageId: string, parameters: any): Envelope {
  return {
    id: uuid(),
    type: MessageTypes.MODEL_RUN_REQUEST,
    source: "model-iframe",
    target: "host",
    version: "1.0",
    data: { docId, pageId, parameters },
  };
}
```

All builders live close to MessageProvider, but payload interfaces are imported from the shared messaging package so everything compiles together.

---

## 8  Testing Checklist

1. **Reducer unit tests** – feed synthetic envelopes, assert state transitions.
2. **MessageProvider mount test** – `jsdom`, simulate `AUTH_STATUS`, ensure outbound queue flushes after `MODEL_CONTEXT`.
3. **Hook test** – call `useRunJobs()` inside `renderHook`, dispatch `MODEL_RUN_STATUS`, assert job progress.

---

*Last updated: 2025‑05‑02*
