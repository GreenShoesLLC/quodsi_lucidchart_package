# Message‑to‑Action Mappers (Strategy 1 – Explicit Category Files)

This document captures the agreed **Strategy 1** for mapping protocol envelopes to `AppAction`s in QReact.

---

## 1  Folder layout

```
shared/src/quodsi-messaging/       # protocol package (existing)

qreact/src/messaging/              # QReact‑specific messaging layer
└─ mappers/
   ├─ framework.mapper.ts          # REACT_APP_READY, ERROR, LOG
   ├─ auth.mapper.ts               # AUTH_* messages
   ├─ subscription.mapper.ts       # SUBSCRIPTION_*
   ├─ selection.mapper.ts          # MODEL_CONTEXT, SELECTION_CHANGED
   ├─ simulation.mapper.ts         # MODEL_RUN_* messages
   ├─ modelOps.mapper.ts           # VALIDATE / CONVERT / REMOVE / RESULTS_PAGE
   └─ index.ts                     # central combiner -> mapEnvelopeToAction()
```

Each `*.mapper.ts` exports exactly **one** function: `mapXxx(msg)` returning `AppAction | null`.

---

## 2  Template for a mapper file

```ts
import { MessageTypes, QuodsiMessage } from "quodsi-messaging";
import { AppAction } from "../state";

export function mapSimulation(msg: QuodsiMessage): AppAction | null {
  switch (msg.type) {
    case MessageTypes.MODEL_RUN_ACK:
      return { type: "RUN_ACK", jobId: msg.data.jobId, queuedAt: msg.data.queuedAt };

    case MessageTypes.MODEL_RUN_STATUS:
      return { type: "RUN_STATUS_UPDATE", status: msg.data };

    default:
      return null; // not handled by this mapper
  }
}
```

*Compile‑time exhaustiveness*: if a new `MODEL_RUN_*` constant is added but not handled here, the compiler warns when strict‑switch rules are enabled (`@typescript-eslint/switch-exhaustiveness-check`).

---

## 3  Central combiner (`mappers/index.ts`)

```ts
import { QuodsiMessage } from "quodsi-messaging";
import { AppAction }     from "../state";

import { mapFramework }    from "./framework.mapper";
import { mapAuth }         from "./auth.mapper";
import { mapSubscription } from "./subscription.mapper";
import { mapSelection }    from "./selection.mapper";
import { mapSimulation }   from "./simulation.mapper";
import { mapModelOps }     from "./modelOps.mapper";

const mappers = [
  mapFramework,
  mapAuth,
  mapSubscription,
  mapSelection,
  mapSimulation,
  mapModelOps,
] as const;

export function mapEnvelopeToAction(msg: QuodsiMessage): AppAction | null {
  for (const fn of mappers) {
    const act = fn(msg);
    if (act) return act; // first match wins
  }
  return null;
}
```

No single file exceeds \~150 LOC, keeping diff noise low and code review focused.

---

## 4  Testing pattern

```
qreact/tests/mappers/
└─ simulation.mapper.spec.ts   # feed MODEL_RUN_STATUS, expect RUN_STATUS_UPDATE action
```

Use a shared helper:

```ts
expectMapping(MessageTypes.MODEL_RUN_ACK, mapSimulation, {
  type: "RUN_ACK",
  jobId: "job‑1",
  queuedAt: "2025‑05‑02T12:00:00Z",
});
```

---

*Last updated: 2025‑05‑02*
