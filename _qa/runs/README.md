# `_qa/runs/` — Test-run reports

This directory holds **run reports** for the test suites in `_qa/`. The suite files themselves (e.g. `005_Activity_Tests.md`) are stable contracts — don't edit them when you run tests. Drop a new file in here instead.

> **Running tests with an AI agent?** The ready-to-paste prompt is in [`AGENT_PROMPT.md`](AGENT_PROMPT.md). It assumes everything in this file and inlines the procedure + gotchas.

## File naming

```
<YYYY-MM-DD>-<runner>-<suite-id>.md
```

Examples:
- `2026-05-28-daniel-005.md` — human run by Daniel
- `2026-05-28-claude-opus-4-7-005.md` — agent run, named by model/agent
- `2026-05-29-daniel-005-retest.md` — second run same day, add a suffix

`<suite-id>` is the leading number on the suite file (`000`, `001`, ..., `011`).

### Split suites (e.g. 006)

Some suites are split into sub-files (e.g. `006a_Assign.md`, `006b_Seize.md`, …, `006l_StateConditionGuard.md`). **Each sub-file is its own suite for run-reporting** — use the letter in the suite-id:

- `2026-05-28-claude-006a.md` — Assign sub-suite
- `2026-05-28-claude-006b.md` — Seize sub-suite
- `2026-05-28-daniel-006.md` — only use the bare number if a single runner walked the **entire** 006 set in one sitting; otherwise prefer one file per sub-suite

This is fine even when there are many sub-files — failure-only reports stay tiny, and one-file-per-sub-suite preserves which sub-suite each run actually covered.

## Failures-only convention

A run report logs **only failures**. Silence (no failure entry) means the test passed. This keeps reports short and forces the runner to spend its words where they matter.

A run with zero failures is still a valid report — it's just header + "no failures."

If a test was **skipped** (preconditions unavailable, feature gated off, dependency broken, ran out of time), record it under a separate `## Skipped` section with a one-line reason. Skips are not failures, but they're not passes either, and they need to be visible so coverage isn't silently lost.

## Template

Copy this for a new run:

```markdown
# Run — <suite name> (<suite-id>)

- **Date:** YYYY-MM-DD
- **Runner:** <name or agent ID, e.g. claude-opus-4-7>
- **Build / commit:** <extension version, or `git rev-parse --short HEAD`>
- **Scope:** <what was run, e.g. "all sections" or "Tab Navigation + Basic Settings only">
- **Environment:** <e.g. local dev with `npm start`, Lucid prod tenant, Chrome 131>
- **Result:** <N> failures / <M> skipped / <K> passed

---

## Failures

### <TEST-ID> — <Test name>
- **Observed:** what actually happened
- **Expected:** what the spec said should happen
- **Repro:** reliable / intermittent (Xx out of Y) / one-off
- **Notes:** console errors, screenshot path, suspected cause, etc.

### <TEST-ID> — <Test name>
...

## Skipped

- **<TEST-ID>** — reason (e.g. "no second activity in test model; need to add one")
- **<TEST-ID>** — reason
```

If there are no failures, replace the `## Failures` section with:

```markdown
## Failures

None.
```

## A few rules

1. **Don't modify the suite file** to mark results. Run reports go here.
2. **Cite the test ID exactly** (e.g. `ACT-AUTOSAVE-003`) so failures are searchable across runs.
3. **One file per run.** Don't append a new day's results to yesterday's file.
4. **Be specific in Observed.** "Didn't work" is not useful; "SaveStatusLine flashed `Saving…` then stuck on `Save failed — keep typing to retry`" is.
5. **If you find a bug worth tracking outside QA, file a GitHub issue and link it in Notes.** Run reports are run artifacts, not a bug tracker.
