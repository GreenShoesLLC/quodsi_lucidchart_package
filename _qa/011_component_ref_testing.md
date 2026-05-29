# 011 — Component Reference Cleanup Tests

Suite of manual / agent-driven QA tests for **referential-integrity cleanup** when shared model components are deleted in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Scope

This suite covers what happens to **references** when you delete a reusable model component. The components in scope are:

| Component | Where it's deleted from | Cleanup entry point (extension) |
|---|---|---|
| **State** | Model Editor → States tab (`StatesEditor`) | `ModelManager.updateStates` → `cleanupStateReferences` |
| **Entity** | Diagram (delete the Entity shape) | `ModelManager.removeElement` → `cleanupEntityReferences` |
| **Resource** | Diagram (delete the Resource shape) | `ModelManager.removeElement` → `cleanupResourceReferences` → `cleanupRequirementReferences` |
| **Resource Requirement** | Model Editor → Resource Requirements tab | `ModelManager.updateResourceRequirements` → `cleanupRequirementReferences` |
| **Time Pattern** | Generator Editor → Time Pattern modal | `ModelManager.updateTimePatterns` → `cleanupTimePatternReferences` |
| **Time Distributed Config** | Generator Editor → Time Distributed Config modal | `ModelManager.updateTimeDistributedConfigs` → `cleanupTimeDistributedConfigReferences` |

The contract is the same across all six: **delete the component, and every referencing field in every other element gets nulled, filtered out of an array, or otherwise reconciled — no orphan references remain anywhere in storage**. After cleanup, model validation should reflect the new state (e.g. an action that lost its required reference now surfaces a validation error).

## Save model (read once)

Component **deletion** uses each parent editor's normal save path; there is no Save/Cancel button here. Concretely:

- **States** and **Resource Requirements** are deleted from the Model Editor. The Model Editor uses 500 ms debounced auto-save (`useAutoSave` in `useEditorState.ts`); the list-changed callback fires immediately on delete confirmation, then the auto-save dispatches to the extension. `SaveStatusLine` cycles `Saving…` → `Saved`.
- **Time Patterns** and **Time Distributed Configs** are deleted from inside the Generator Editor's modals; same auto-save model applies to the parent Generator Editor.
- **Entities** and **Resources** are deleted by removing the diagram shape itself. There is no save status line in that path — the extension's shape-removal handler calls `removeElement`, which performs the cascading cleanup synchronously and then re-validates the model. Verify the cleanup by re-selecting the previously-referencing element (its dropdowns/lists should show the reference is gone) and by inspecting the Validation panel.

This suite asserts only the **post-deletion model state**. The auto-save mechanism itself is covered by the parent editors' suites (Model, Generator, Activity).

## Cleanup contracts (read once)

How each cleanup re-shapes the references it finds:

| Field type | Cleanup behavior |
|---|---|
| Foreign-key field on a single record (e.g. `Generator.generationConfig.entityId`) | **Nulled** (set to `null`/`undefined`); the parent record stays |
| Array of references (e.g. `initialStateModifications`, `timeDistributedConfigIds`) | **Filtered** — entries pointing at the deleted ID are removed; sibling entries kept |
| Embedded object whose key is the deleted name (e.g. `Connector.stateCondition` keyed by state name) | **Cleared** — the embedded object is set to `null` |
| Action with a required reference (e.g. `SEIZE`, `RELEASE`) | Reference is nulled or the action is removed per per-action policy in `ModelManager`; downstream validation surfaces the missing-reference error |
| Auto-generated `ResourceRequirement` whose backing resource is deleted | Requirement record is removed from `modelDef.resourceRequirements`, then its own cleanup cascades into actions |

Sibling components of the same type (e.g. State A and State C when State B is deleted) must be **completely untouched** — that's an explicit assertion in several tests.

---

## States

### REF-ST-001 — Delete state referenced in Generator initialStateModifications [P1]

**Preconditions**
- Model has a Generator
- Generator's `generationConfig.initialStateModifications` references a model state
- Model state exists in the model

**Steps**
1. Open the Model Editor
2. Navigate to the States tab
3. Locate the state that is referenced by the Generator
4. Delete the state (confirm in the red warning panel)

**Expected**
- The state disappears from the States list
- The Generator's `generationConfig.initialStateModifications` array is filtered — the entry referencing the deleted state is removed; sibling entries (if any) remain
- The Generator remains valid (no other parts of it are touched)
- No orphan state reference exists anywhere in the model

**Context:** `ModelManager.cleanupStateReferences` walks Generators on the page; the filter is by `mod.stateUniqueId !== stateId`.

### REF-ST-002 — Delete state referenced in Activity sourceConfig.initialStateModifications [P1]

**Preconditions**
- Model has an Activity using `SOURCE` operation mode
- Activity's `sourceConfig.initialStateModifications` references a model state
- The state exists in the model

**Steps**
1. Open the Model Editor → States tab
2. Delete the referenced state

**Expected**
- State is removed
- Activity's `sourceConfig.initialStateModifications` array is filtered — the matching entry is removed
- Activity remains otherwise valid
- No orphan state reference exists

### REF-ST-003 — Delete state referenced in Connector stateModifications [P1]

**Preconditions**
- Model has a Connector with a `stateModifications` array entry referencing a state
- The state exists in the model

**Steps**
1. Open the Model Editor → States tab
2. Delete the referenced state

**Expected**
- State is removed
- Connector's `stateModifications` array is filtered — the matching entry is removed
- Connector remains otherwise valid
- No orphan state reference exists

**Context:** Connector cleanup is in the same `cleanupStateReferences` pass that walks `page.allLines`.

### REF-ST-004 — Delete state referenced in Connector stateCondition [P1]

**Preconditions**
- Model has a Connector with a `stateCondition` whose `stateName` matches a model state
- The state exists in the model

**Steps**
1. Open the Model Editor → States tab
2. Delete the referenced state

**Expected**
- State is removed
- The Connector's `stateCondition` is cleared (set to `null`) — not just emptied, the whole object goes away
- Connector remains otherwise valid

**Context:** `stateCondition` is matched by **name**, not ID (`elementData.stateCondition.stateName === stateName`).

### REF-ST-005 — Delete state referenced in ASSIGN action modifications [P1]

**Preconditions**
- Model has an Activity with an `ASSIGN` action whose `stateModifications` references a state
- The state exists in the model

**Steps**
1. Open the Model Editor → States tab
2. Delete the referenced state

**Expected**
- State is removed
- The `ASSIGN` action's `stateModifications` array is filtered — the matching entry is removed
- The action itself remains (it isn't deleted just because one modification was)
- Activity remains otherwise valid

**Context:** `cleanActionsStateReferences` recurses into action arrays and also into `LOOP` action's nested `actions`.

### REF-ST-006 — Delete state referenced in SPLIT action modifications [P1]

**Preconditions**
- Model has an Activity with a `SPLIT` action whose `stateModifications` references a state
- The state exists in the model

**Steps**
1. Open the Model Editor → States tab
2. Delete the referenced state

**Expected**
- State is removed
- The `SPLIT` action's `stateModifications` array is filtered — the matching entry is removed
- The action itself remains
- Activity remains otherwise valid

### REF-ST-007 — Delete state used in multiple locations simultaneously [P1]

**Preconditions**
- A single state is referenced in **all** of these places at once:
  - A Generator's `initialStateModifications`
  - An Activity's `sourceConfig.initialStateModifications`
  - A Connector's `stateModifications` or `stateCondition`
  - An action's `stateModifications`

**Steps**
1. Open the Model Editor → States tab
2. Delete the shared state

**Expected**
- State is removed
- **Every** reference is cleaned in a single pass: Generator filtered, Activity sourceConfig filtered, Connector cleaned, action filtered
- The cleanup count logged by the extension reflects every affected element (one debug log per element type touched)
- All components remain valid where their reference was an array entry; references that were required fields surface a validation issue

### REF-ST-008 — Delete one of several states leaves siblings intact [P2]

**Preconditions**
- Model has at least 3 states (A, B, C)
- Each state is referenced in at least one different component

**Steps**
1. Open the Model Editor → States tab
2. Delete State B

**Expected**
- State B is removed from the States list
- State A's references are completely untouched (re-selecting any element that used State A still shows State A wired up)
- State C's references are completely untouched
- Only references to State B are cleaned up

---

## Entities

### REF-EN-001 — Delete entity referenced in Generator generationConfig.entityId [P1]

**Preconditions**
- Model has a Generator with `generationConfig.entityId` set to an entity
- The entity exists in the model (shape on the diagram)

**Steps**
1. On the diagram, select the Entity shape
2. Delete it (LucidChart Delete key)

**Expected**
- Entity shape is removed
- Generator's `generationConfig.entityId` is **nulled** (set to `null`/`undefined`) — the Generator record remains
- Re-selecting the Generator: the entity dropdown is empty
- The model validation surfaces "entity is required" on the Generator

**Context:** Shape deletion goes through `ModelManager.removeElement` → `cleanupEntityReferences`.

### REF-EN-002 — Delete entity referenced in Activity sourceConfig.entityId [P1]

**Preconditions**
- Model has an Activity using `SOURCE` operation mode with `sourceConfig.entityId` set
- The entity exists in the model

**Steps**
1. On the diagram, delete the Entity shape

**Expected**
- Entity is removed
- Activity's `sourceConfig.entityId` is nulled
- Activity validation shows the entity is required for `SOURCE` mode

### REF-EN-003 — Delete entity referenced in CREATE action entityTemplateId [P1]

**Preconditions**
- Model has an Activity with a `CREATE` action whose `entityTemplateId` is set
- The entity exists in the model

**Steps**
1. On the diagram, delete the Entity shape

**Expected**
- Entity is removed
- The `CREATE` action's `entityTemplateId` is nulled
- The action itself remains (it isn't deleted; only the FK is cleared)
- Activity validation surfaces "entity template is required for CREATE action"

**Context:** `cleanActionsEntityReferences` handles CREATE actions; the field is **nullified**, not the action removed.

### REF-EN-004 — Delete entity used in multiple generators [P1]

**Preconditions**
- Model has 2+ Generators that all reference the same entity in `generationConfig.entityId`

**Steps**
1. On the diagram, delete the shared Entity shape

**Expected**
- Entity is removed
- **Every** Generator's `generationConfig.entityId` is nulled — none is skipped
- Each affected Generator shows a validation warning that an entity is required
- No orphan reference remains in any Generator

### REF-EN-005 — Delete one of several entities leaves siblings intact [P2]

**Preconditions**
- Model has Entity A, B, C, each used in different Generators / Activities / CREATE actions

**Steps**
1. On the diagram, delete Entity B

**Expected**
- Entity B is removed
- Entity A's references are completely untouched
- Entity C's references are completely untouched
- Only references to Entity B are cleaned up

---

## Resources

### REF-RS-001 — Delete resource removes its auto-generated requirement [P1]

**Preconditions**
- Model has a Resource (with the auto-generated `ResourceRequirement` that's created alongside any resource)
- The resource is displayed on the diagram

**Steps**
1. On the diagram, select the Resource shape
2. Delete it

**Expected**
- Resource is removed from the model
- The auto-generated `ResourceRequirement` (whose `id` matches the resource id) is also removed
- No orphan requirement remains
- Model validation passes (no "missing resource" error from the removed auto-requirement)

**Context:** `removeElement` explicitly calls `modelDef.resourceRequirements.remove(elementId)` after `cleanupResourceReferences` finishes.

### REF-RS-002 — Delete resource removes a custom requirement that references it [P1]

**Preconditions**
- Model has a Resource
- A **custom** (non-auto) `ResourceRequirement` references this resource in its clause tree
- That requirement is used by at least one Activity action

**Steps**
1. On the diagram, delete the Resource shape

**Expected**
- Resource is removed
- The custom `ResourceRequirement` is also removed (it can't function without its backing resource)
- The Activity action that used the requirement is updated by the requirement-cleanup cascade (see REF-RQ-001/002/003 for per-action-type behavior)
- No orphan references remain

**Context:** `cleanupResourceReferences` returns the IDs of deleted requirements; `removeElement` then loops them through `cleanupRequirementReferences`.

### REF-RS-003 — Delete resource with multiple requirements referencing it [P1]

**Preconditions**
- Model has a Resource
- Multiple `ResourceRequirement`s reference this resource
- These requirements are used by actions across **different** Activities

**Steps**
1. On the diagram, delete the Resource shape

**Expected**
- Resource is removed
- **All** requirements that referenced this resource are removed
- For each deleted requirement, **all** Activities' actions that used it are updated (per-action policy)
- No orphan references remain anywhere

### REF-RS-004 — Delete resource leaves unrelated resources intact [P2]

**Preconditions**
- Model has Resource A and Resource B
- Each resource has its own requirements
- Activities use requirements from both

**Steps**
1. On the diagram, delete Resource A

**Expected**
- Resource A is removed
- Requirements for Resource A are removed
- Resource B is unchanged
- Requirements for Resource B are unchanged
- Activities using Resource B's requirements continue to validate

### REF-RS-005 — Delete resource updates activity SEIZE/RELEASE actions [P1]

**Preconditions**
- Model has a Resource
- An Activity has both `SEIZE` and `RELEASE` actions that reference the requirement backing this resource

**Steps**
1. On the diagram, delete the Resource shape

**Expected**
- Resource is removed
- The associated requirement is removed
- The Activity's `SEIZE` / `RELEASE` actions are updated per the requirement-cleanup policy (see REF-RQ-001/002 — typically the action's `requirementId` is cleared)
- Activity validation surfaces "requirement is needed"

---

## Resource Requirements

### REF-RQ-001 — Delete requirement used in Activity SEIZE action [P1]

**Preconditions**
- Model has a Resource and a `ResourceRequirement` for it
- An Activity has a `SEIZE` action referencing this requirement

**Steps**
1. Open the Model Editor
2. Navigate to the Resource Requirements tab
3. Delete the requirement

**Expected**
- Requirement is removed
- The `SEIZE` action's `requirementId` is cleared per the requirement-cleanup policy
- Activity validation surfaces "requirement is needed for SEIZE"
- No orphan reference remains

**Context:** Triggered via `ModelManager.updateResourceRequirements`; cleanup is `cleanupRequirementReferences`.

### REF-RQ-002 — Delete requirement used in Activity RELEASE action [P1]

**Preconditions**
- Same as above, but the Activity has a `RELEASE` action referencing the requirement

**Steps**
1. Model Editor → Resource Requirements tab
2. Delete the requirement

**Expected**
- Requirement is removed
- The `RELEASE` action's `requirementId` is cleared
- Activity validation surfaces "requirement is needed for RELEASE"
- No orphan reference remains

### REF-RQ-003 — Delete requirement used in DELAY_WITH_RESOURCE action [P1]

**Preconditions**
- An Activity has a `DELAY_WITH_RESOURCE` action referencing the requirement

**Steps**
1. Model Editor → Resource Requirements tab
2. Delete the requirement

**Expected**
- Requirement is removed
- The `DELAY_WITH_RESOURCE` action's `requirementId` is **nullified** (per the cleanup policy: SEIZE/RELEASE may be removed wholesale, DELAY_WITH_RESOURCE is nulled-in-place — the action stays)
- Activity validation surfaces "requirement is needed"

### REF-RQ-004 — Delete requirement used in multiple activities [P1]

**Preconditions**
- A single requirement is referenced by actions across 2+ Activities

**Steps**
1. Model Editor → Resource Requirements tab
2. Delete the shared requirement

**Expected**
- Requirement is removed
- **Every** Activity's actions that referenced it are updated per action-type policy
- Every affected Activity surfaces a validation issue
- No orphan reference remains in any Activity

### REF-RQ-005 — Delete one of several requirements leaves siblings intact [P2]

**Preconditions**
- Model has 3 requirements (Req A, B, C), each used in different Activities

**Steps**
1. Model Editor → Resource Requirements tab
2. Delete Req B

**Expected**
- Req B is removed
- Req A's references are completely untouched
- Req C's references are completely untouched
- Only references to Req B are cleaned up

---

## Time Patterns

### REF-TP-001 — Delete time pattern removes its associated TimeDistributedConfigs [P1]

**Preconditions**
- Model has a `TimePattern`
- One or more `TimeDistributedConfig`s reference this pattern

**Steps**
1. Open a Generator that uses the pattern
2. Open the Time Pattern management modal
3. Delete the time pattern

**Expected**
- TimePattern is removed from the model
- All `TimeDistributedConfig`s that referenced this pattern are also removed
- Any Generator references to those configs (via `timeDistributedConfigIds`) are cleaned up (see REF-TP-002)
- No orphan reference remains

**Context:** Triggered via `ModelManager.updateTimePatterns` → `cleanupTimePatternReferences`.

### REF-TP-002 — Delete time pattern updates Generator timeDistributedConfigIds [P1]

**Preconditions**
- Model has a `TimePattern`
- A Generator's `timeDistributedConfigIds` includes configs that use this pattern
- The pattern is used for scheduled generation

**Steps**
1. Open the Time Pattern management modal
2. Delete the time pattern

**Expected**
- TimePattern is removed
- The cascading deletion of associated `TimeDistributedConfig`s drives the Generator's `timeDistributedConfigIds` array to be **filtered** — deleted config IDs are removed; surviving config IDs are kept
- If the Generator now has no configs and configs are required by its type, validation surfaces that

### REF-TP-003 — Delete time pattern used by multiple configs [P1]

**Preconditions**
- A single TimePattern is referenced by multiple `TimeDistributedConfig`s
- Those configs are used by different Generators

**Steps**
1. Delete the shared pattern (from the Time Pattern modal)

**Expected**
- TimePattern is removed
- **All** `TimeDistributedConfig`s that referenced this pattern are removed
- **All** affected Generators' `timeDistributedConfigIds` arrays are filtered
- No orphan reference remains anywhere

### REF-TP-004 — Delete time pattern leaves unrelated patterns intact [P2]

**Preconditions**
- Model has Pattern A and Pattern B; each has its own configs; Generators use configs from both

**Steps**
1. Delete Pattern A

**Expected**
- Pattern A is removed
- Configs for Pattern A are removed
- Pattern B is unchanged
- Configs for Pattern B are unchanged
- Generators using Pattern B's configs continue to validate

---

## Time Distributed Configs

### REF-TD-001 — Delete time distributed config removes Generator reference [P1]

**Preconditions**
- Model has a `TimeDistributedConfig`
- A Generator's `timeDistributedConfigIds` includes this config
- The config is used for time-based generation

**Steps**
1. Open a Generator that uses the config
2. Open the Time Distributed Configs management modal
3. Delete the config

**Expected**
- TimeDistributedConfig is removed
- The Generator's `timeDistributedConfigIds` array is filtered — this config ID is removed; siblings are kept
- If the Generator now has no configs and its type requires them, validation surfaces that
- No orphan reference remains

**Context:** Triggered via `ModelManager.updateTimeDistributedConfigs` → `cleanupTimeDistributedConfigReferences`.

### REF-TD-002 — Delete config referenced by multiple generators [P1]

**Preconditions**
- A single `TimeDistributedConfig` is referenced by multiple Generators

**Steps**
1. Delete the shared config

**Expected**
- TimeDistributedConfig is removed
- **All** Generators' `timeDistributedConfigIds` arrays are filtered
- All affected Generators surface a validation issue if configs are required
- No orphan reference remains in any Generator

### REF-TD-003 — Delete one of several configs leaves siblings intact [P2]

**Preconditions**
- Model has 3 configs (A, B, C), each used by different Generators

**Steps**
1. Delete Config B

**Expected**
- Config B is removed
- Config A's references are completely untouched
- Config C's references are completely untouched
- Only references to Config B are cleaned up
