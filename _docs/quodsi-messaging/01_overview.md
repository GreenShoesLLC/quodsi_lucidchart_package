# Quodsi Panel Messaging Protocol (v0.9)

This repository defines the postMessage protocol used by the Quodsi editor extension (Qext) and its embedded React panels (QReact).  The protocol is versioned separately from application code so that host and iframe can evolve independently while remaining interoperable.

---

## Envelope (applies to **every** message)

| Field     | Type                                                       | Description                                        |
| --------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `id`      | `string` (UUID)                                            | Unique per message; correlates request ↔ response. |
| `type`    | `string` (enum)                                            | Discriminant that selects the payload schema.      |
| `source`  | `"host" \| "model‑iframe" \| "auth‑iframe"`                | Originating context.                               |
| `target`  | `"host" \| "model‑iframe" \| "auth‑iframe" \| "broadcast"` | Intended recipient.                                |
| `version` | `"1.0"`                                                    | Protocol version.                                  |
| `data`    | `object`                                                   | Payload whose structure depends on `type`.         |

> **Design choice:** a single flat envelope with a discriminated‑union `type` keeps routing simple and makes TypeScript exhaustiveness checks possible.

---

## Message Categories

| Category               | Purpose                                         | Markdown spec            |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| Framework & Lifecycle  | Bootstrapping, generic errors, dev logging      | `framework_lifecycle.md` |
| Authentication         | Sign‑in / out, password reset, auth state sync  | `authentication.md`      |
| Subscription & Billing | Tier changes, feature flags                     | `subscription.md`        |
| Selection & Context    | Lucid selection changes and initial doc context | `selection.md`           |
| Simulation Run         | Start job, ACK, unified status/progress         | `simulation.md`          |
| Model Operations       | Validate, convert, remove models                | `model_ops.md`           |
| Results Page           | Create a Lucid results page from run output     | `results_page.md`        |
| Cloud Storage Linking  | Connect / disconnect Google Drive & OneDrive    | `storage.md`             |
| Reserved / Future      | Pause / resume / cancel jobs                    | (to be merged later)     |

Each linked markdown file documents **only** the messages that belong to that category.  A typical file contains:

* High‑level intent and when the messages fire
* Table of message constants with full payload schema
* Sequence diagram examples (Mermaid)
* Versioning / extension notes for that category

---

## Contributing

* Update the per‑category markdown first.
* Increment the top‑level `version` field only when a payload schema changes in a backward‑incompatible way.
* Run `npm test` to ensure every `EnvelopeMessageType` constant has a matching payload interface and spec entry.

---

### Status

**DRAFT v0.9** – awaiting final field / naming confirmation before freeze to **1.0**.
