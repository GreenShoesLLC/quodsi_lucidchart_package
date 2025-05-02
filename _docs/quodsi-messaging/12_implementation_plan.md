# Quodsi Messaging – Implementation Roadmap

This roadmap lays out the recommended build order and deliverables for moving from *spec docs* to working TypeScript code.  We prioritise **shared assets first**, followed by **extension‑side (Qext)** wiring, and finally **panel‑side (QReact)** integration.

---

## Phase 1 Protocol Package (`shared/src/quodsi-messaging`)

| Task                                                         | Key files                                    | Acceptance                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Scaffold folders (`envelope`, categories)                 | `yarn workspace add` OR manual mkdir         | Directory tree matches `quodsi_messaging_structure.md`                                            |
| 2. Implement `message-types.ts` (string constants)           | `envelope/message-types.ts`                  | Enum covers **all** constants documented in markdown specs; unit test auto‑verifies unique values |
| 3. Create `EnvelopeBase` + runtime `isEnvelope()`            | `envelope/envelope.ts`, `envelope/guards.ts` | Jest tests pass for valid & invalid samples                                                       |
| 4. Implement category `messages.ts` files                    | `auth/`, `simulation/`, etc.                 | `tsc --noEmit` passes; each interface `extends EnvelopeBase`                                      |
| 5. Assemble root barrel (`index.ts`)                         | re‑export unions + helpers                   | Consumer project compiles with `import { QuodsiMessage }`                                         |
| 6. Add basic builders (`builders.ts`)                        | uuid + type helper per category              | Covered by unit tests                                                                             |
| 7. Publish **local** npm tarball for Qext/QReact consumption | `npm pack`                                   | Both apps resolve `quodsi-messaging` via workspace link                                           |

> **Outcome**: A reusable protocol library, test‑covered and IDE‑friendly.

---

## Phase 2 Host‑side Integration (Qext)

| Task                                                           | Files                                      | Acceptance                                                             |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| 1. Add `router.ts` singleton per `extension_message_router.md` | `qext/src/router.ts`                       | Unit tests use mock panels to verify queue flush & broadcast           |
| 2. Adapt `ModelPanel` & `AuthPanel` subclasses                 | `qext/src/model-panel.ts`, `auth-panel.ts` | Panels register with router, relay messages; Lucid SDK demo shows logs |
| 3. Replace direct `sendMessage` calls in business logic        | all features                               | Lint rule forbids `panel.sendMessage` outside router                   |
| 4. Implement auth‑cache + subscription fan‑out inside router   | `router.ts`                                | Manual test: login in AuthPanel updates ModelPanel instantly           |
| 5. Integration smoke test in Lucid sandbox                     | QA doc                                     | All selection, run, validation flows succeed                           |

---

## Phase 3 Panel‑side Integration (QReact)

| Task                                                                          | Files                                          | Acceptance                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 1. Add `messaging/` folder with **MessageProvider** per `message_provider.md` | `qreact/src/messaging/`                        | Provider exposes send + state; unit tests cover reducer                     |
| 2. Implement mappers folder using **Strategy 1**                              | `qreact/src/messaging/mappers/`                | Each mapper <150 LOC; central combiner passes exhaustiveness test           |
| 3. Wrap React tree (`index.tsx`) with `MessageProvider`                       | `src/main.tsx`                                 | UI loads; sends `REACT_APP_READY`                                           |
| 4. Replace local state in `QuodsiApp` with context hooks                      | `src/QuodsiApp.tsx`                            | Components render from provider slices; no prop drilling                    |
| 5. Implement outbound helpers (`hostSender.ts`)                               | typed builders reuse `quodsi-messaging` models | Clicking Run/Validate sends correct envelopes (verified via DevTools)       |
| 6. End‑to‑end Playwright test                                                 | `/e2e/`                                        | Open AuthPanel, log in, open ModelPanel, run sim, progress bar reaches 100% |

---

## Phase 4 Polish & CI

1. **ESLint + Prettier** presets shared across projects.
2. **CI job** – `pnpm -r test && pnpm -r build` ensures protocol pkg and both apps compile on PR.
3. **Version bump** rule: changing any `message-types.ts` constant or interface requires incrementing `EnvelopeBase.version`.

---

### Estimated Timeline *(small team, 1 dev each phase)*

| Phase           | Effort   |
| --------------- | -------- |
| 1. Protocol pkg | 2–3 days |
| 2. Host router  | 2 days   |
| 3. QReact layer | 3–4 days |
| 4. Polish & CI  | 1 day    |

*Total \~8–10 developer‑days.*

---

*Last updated: 2025‑05‑02*
