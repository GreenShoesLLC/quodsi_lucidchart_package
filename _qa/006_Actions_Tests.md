# 006 — Actions Tests (split across files)

Action editor tests are split per action type so multiple agents can update or execute them in parallel without contention, and so a code change to a single action editor only dirties one file.

| File | Action type | Tests |
|---|---|---|
| `006a_Assign.md` | Assign State | 8 |
| `006b_Seize.md` | Seize Resource | 7 |
| `006c_Release.md` | Release Resource | 6 |
| `006d_Delay.md` | Delay | 7 |
| `006e_DelayWithResource.md` | Delay with Resource | 9 |
| `006f_Split.md` | Split Entity | 11 |
| `006g_Create.md` | Create Entity | 9 |
| `006h_Dispose.md` | Dispose Entity | 7 |
| `006i_Join.md` | Join Entities | 11 |
| `006j_Loop.md` | Loop (JSON-import only) | 8 |
| `006k_Branch.md` | Branch (JSON-import only) | 11 |
| `006l_StateConditionGuard.md` | Per-action state-condition guard (cross-cutting) | 4 |

**Total:** 98 tests across 12 files.

## Cross-references (where related tests live)

- **High-level Actions tab behaviors** (add / delete / drag-reorder / type-switch / save-status framing) — `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- **Auto-save mechanics** (debounce, blur-flush, status-line states) — `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)
- **Per-distribution input mechanics** (used by Delay, DWR durations, MTBF/MTTR) — `004_Duration_Editor_Tests.md`

## Run-reporting

Each sub-file is its own suite for run-reporting purposes. Run files go in `_qa/runs/` named `YYYY-MM-DD-<runner>-006<letter>.md` (e.g. `2026-05-28-claude-006a.md`). See `_qa/runs/README.md`.
