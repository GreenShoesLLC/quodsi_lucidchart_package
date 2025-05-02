# Authentication Messages

This spec describes all message types related to user identity and session handling between the Quodsi extension host (**Qext**) and the React panels (**QReact**).  Authentication is powered by Microsoft Entra ID (B2C) on the client side and synchronized with the Quodsi FastAPI backend for session management.

> Every message inherits the standard envelope defined in `overview.md` ( `id`, `type`, `source`, `target`, `version`, `data` ).

---

## 1  Message Catalogue

| `type` constant           | Direction                 | Fired …                                                                                        | `data` payload                                          |
| ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **`AUTH_LOGIN_SUCCESS`**  | `model‑iframe ► host`     | • After MSAL sign‑in **or** sign‑up finishes in popup.                                         | `{ idToken: string; user: UserInfo; newUser: boolean }` |
| **`AUTH_LOGOUT`**         | `model‑iframe ► host`     | • When user clicks **Sign Out**.<br>• When silent token refresh fails and panel forces logout. | `{}`                                                    |
| **`AUTH_PASSWORD_RESET`** | `model‑iframe ► host`     | • Successful completion of the B2C password‑reset flow.                                        | `{ email: string }`                                     |
| **`AUTH_STATUS`**         | `host ► any ready iframe` | • Immediately after `REACT_APP_READY`.<br>• Broadcast whenever login / logout occurs.          | `{ isAuthenticated: boolean; user?: UserInfo }`         |
| **`AUTH_REQUIRED`**       | `host ► model‑iframe`     | • Host blocks an operation because user is unauthenticated.                                    | `{ reason: "not_authenticated" \| "session_expired" }`  |
| **`AUTH_ERROR`**          | `any ► host`              | • Non‑PII auth failure (popup blocked, invalid token, etc.).                                   | `{ code: string; message: string }`                     |

### Helper Type

```ts
interface UserInfo {
  id: string;            // B2C objectId (sub)
  email: string;         // Primary sign‑in address
  displayName?: string;  // Friendly name (optional)
}
```

---

## 2  Sequence Diagrams

### 2.1  Sign‑in / Sign‑up (Happy Path)

```mermaid
sequenceDiagram
  participant QR as QReact (model‑iframe)
  participant HX as Host (Qext)
  participant MS as Entra ID B2C
  participant BE as FastAPI

  QR->>MS: MSAL popup & PKCE flow
  MS-->>QR: id_token / access_token
  QR->>HX: AUTH_LOGIN_SUCCESS
  HX->>BE: POST /auth/sync {id_token}
  BE-->>HX: backend JWT + user row
  HX-->>QR: AUTH_STATUS {isAuthenticated:true}
  HX-->>broadcast: AUTH_STATUS {...}
```

### 2.2  Session Expiry → Logout

```mermaid
sequenceDiagram
  QR->>QR: silent acquireToken
  QR--x QR: failure (interaction_required)
  QR->>HX: AUTH_LOGOUT
  HX->>broadcast: AUTH_STATUS {isAuthenticated:false}
```

---

## 3  State Machine (Panel Side)

```mermaid
stateDiagram-v2
  [*] --> Unauthenticated
  Unauthenticated --> Authenticating: openPopup()
  Authenticating --> Authenticated: AUTH_LOGIN_SUCCESS
  Authenticated --> Unauthenticated: AUTH_LOGOUT / AUTH_STATUS(false)
```

---

## 4  Error Handling Guidelines

* `AUTH_ERROR` **must never** leak PII.
* Host logs error to console **and** telemetry.
* For user‑facing feedback, panel maps `code` → toast / modal message.

---

## 5  Open Items / Future Work

1. Multi‑tenant support (`tenantId` claim)
2. Support for MFA‑required flows (B2C custom policies)
3. Token encryption at rest in host cache if browser Storage Access API becomes available.
