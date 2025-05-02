# Framework & Lifecycle Messages

This document details the base‑level messages that bootstrap communication between Quodsi’s extension host (Qext) and its iframe panels (QReact). These messages are **transport‑agnostic** and do **not** assume any domain logic such as authentication, selection, or simulation—they exist solely to bring the channel online and keep it observable during development.

> **All messages below inherit the common envelope defined in `overview.md`. Only the `data` property is shown here.**

---

## 1  `REACT_APP_READY`

| Field             | Type                     | Description                                                            |
| ----------------- | ------------------------ | ---------------------------------------------------------------------- |
| `panel`           | "model" \| "auth"        | Which Lucid panel this iframe represents.                              |
| `isAuthenticated` | `boolean`                | Initial auth probe result (true = MSAL already holds a valid account). |
| `user`            |  `UserInfo` \*optional\* | Basic user snapshot if `isAuthenticated` is true.                      |

**Direction**  `iframe ► host`

**When sent**  Immediately after QReact mounts and MSAL completes a silent login attempt. This is the first application‑level message in the session.

**Host action**

1. Records a channel object (`ready = true`).
2. Flushes any queued outbound messages.
3. Broadcasts `AUTH_STATUS` and `SUBSCRIPTION_STATUS` if available.

---

## 2  `ERROR`

| Field     | Type                  | Description                                                                                  |
| --------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `code`    | `string`              | Short machine‑readable identifier (`"msal_popup_blocked"`, `"sim_validation_failed"`, etc.). |
| `message` | `string`              | Human‑readable summary (no PII).                                                             |
| `id`      | `string` \*optional\* | The `id` of the request that triggered this error (correlation).                             |

**Direction**  `any ► host` (panels or host may emit)

**Usage guidelines**

* Avoid spamming—surface only actionable failures.
* Qext logs `code`/`message` to console and forwards to Sentry in production.
* Host may optionally re‑broadcast to the originating panel if UI feedback is needed.

---

## 3  `LOG` (development only)

| Field   | Type              | Description   |
| ------- | ----------------- | ------------- |
| `level` | "debug" \| "info" | Log severity. |
| `text`  | `string`          | Log content.  |

**Direction**  `any ► host`

**Notes**

* Emitted only when `window.__QUODSI_DEV_LOG = true`.
* Host appends to an in‑memory ring buffer (`window._msgLog`) to aid debugging with DevTools‑attached panels.

---

## Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
  participant LC as Lucid (host page)
  participant HX as Qext (host script)
  participant QR as QReact (iframe)

  LC->>HX: Lucid panel icon clicked
  HX->>LC: inject iframe[src=index.html]
  QR->>HX: REACT_APP_READY{ isAuthenticated=false }
  HX->>QR: AUTH_STATUS{ false }
  note over HX,QR: Panel now online; other categories take over (selection, auth, etc.)
```

---

## Versioning & Future‑Proofing

* The payload of `REACT_APP_READY` intentionally mirrors the first fields of `AUTH_STATUS` to keep reducers simple.
* Additional envelope‑level fields (e.g., `traceId`) can be introduced in minor protocol versions (`1.1`, `1.2`, …) without breaking existing panels; host fills defaults when missing.

---

## Changelog

| Version | Date       | Change                                               |
| ------- | ---------- | ---------------------------------------------------- |
| 0.9     | 2025‑05‑02 | Initial extraction from consolidated protocol draft. |

---

### Related Specs

* [`overview.md`](./overview.md) – Envelope and index of all categories.
* [`authentication.md`](./authentication.md) – Auth & identity messages.
* [`selection_context.md`](./selection_context.md) – Document & selection updates.
* [`simulation.md`](./simulation.md) – Model run / validate / convert.
