# Extension‑side MessageRouter

This document describes the TypeScript implementation pattern for the **MessageRouter** singleton that lives inside `extension.ts`.  The router glues together Quodsi’s host logic and Lucid’s `Panel` subclasses (AuthPanel and ModelPanel) while enforcing the common postMessage protocol.

---

## 1  Responsibilities

1. **Channel registry** – Maintain one entry per panel (`auth`, `model`) with a reference to the `Panel` instance, a readiness flag, and an outbound queue.
2. **Queueing** – Hold messages until the target panel posts `REACT_APP_READY`.
3. **Relay** – Deliver envelopes via `panel.relayToIframe(payload)` or broadcast to all ready panels.
4. **Validation** – Reject malformed envelopes or disallowed origins.
5. **Event fan‑out** – Update both panels when global state (auth, subscription) changes.
6. **Diagnostics** – Optional dev flag logs every routed envelope to `window.__msgLog`.

---

## 2  Core API

```ts
interface MessageRouter {
  registerChannel(role: "auth" | "model", panel: RoutablePanel): void;
  send(target: "auth" | "model" | "broadcast", msg: Envelope): void;
  receive(msg: Envelope): void; // called by Panel.messageFromFrame
}

interface RoutablePanel {
  relayToIframe(msg: Envelope): void; // implemented in Panel subclass
}
```

---

## 3  Skeleton Implementation

```ts
// router.ts
import { Envelope, MessageTypes } from "../quodsi-messaging";
import { v4 as uuid } from "uuid";

class MessageRouter {
  private channels: Record<"auth" | "model", {
    panel?: RoutablePanel;
    ready: boolean;
    queue: Envelope[];
  }> = {
    auth:  { ready: false, queue: [] },
    model: { ready: false, queue: [] },
  };

  registerChannel(role: "auth" | "model", panel: RoutablePanel): void {
    const ch = this.channels[role];
    ch.panel = panel;
  }

  send(target: "auth" | "model" | "broadcast", msg: Envelope): void {
    if (target === "broadcast") {
      (Object.keys(this.channels) as ("auth"|"model")[]).forEach(r =>
        this.enqueueOrSend(r, msg));
    } else {
      this.enqueueOrSend(target, msg);
    }
  }

  private enqueueOrSend(role: "auth" | "model", msg: Envelope) {
    const ch = this.channels[role];
    if (ch.ready && ch.panel) ch.panel.relayToIframe(msg);
    else ch.queue.push(msg);
  }

  receive(msg: Envelope) {
    if (msg.type === MessageTypes.REACT_APP_READY) {
      const role = (msg as any).data.panel as "auth" | "model";
      const ch   = this.channels[role];
      ch.ready   = true;
      ch.queue.forEach(m => ch.panel!.relayToIframe(m));
      ch.queue.length = 0;
      return; // no further routing
    }
    // handle auth, subscription, etc. with switch(msg.type)…
  }
}

export const router = new MessageRouter();
```

---

## 4  Panel Glue

```ts
class ModelPanel extends Panel implements RoutablePanel {
  protected didMount() {
    router.registerChannel("model", this);
  }

  protected messageFromFrame(message: unknown) {
    if (!isEnvelope(message)) return;
    message.source = "model-iframe";
    message.target = "host";
    router.receive(message);
  }

  relayToIframe(msg: Envelope) {
    this.sendMessage(msg);
  }
}
```

---

## 5  Test Strategy

* **Unit** – Mock two `RoutablePanel` stubs; verify queue flush, broadcast, origin filter.
* **Integration** – Load extension in Lucid sandbox, open panels in varying order, watch `AUTH_STATUS` and `MODEL_CONTEXT` flow correctly.

---

*Last updated: 2025‑05‑02*
