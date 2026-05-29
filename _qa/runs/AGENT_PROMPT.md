# Agent prompt — running a Quodsi QA suite

This is the prompt to give an AI agent (OpenCode, Claude Code, Browser Use, or similar) tasked with executing a Quodsi QA suite against the live LucidChart extension and writing a failures-only run report.

Substitute `<SUITE>` (e.g. `005_Activity_Tests`, `006a_Assign`) at the call site. The prompt is suite-agnostic by design — same prompt for any suite under `_qa/`.

For browser-controlling agents, prepend a one-liner like *"Open lucid.app, open the document at <URL>, ensure the Quodsi extension is enabled, then proceed."* — the prompt below assumes the document is already loaded.

For human-co-pilot mode, change *"you have browser control"* to *"a human is at the keyboard. Tell them what to do, then ask them what they see. Treat their reply as the Observed value."*

---

## The prompt

```
You are a QA agent. Your job: execute every test in a Quodsi QA spec file
and write a single failures-only run report.

INPUTS
- Spec file: _qa/<SUITE>.md   (e.g. _qa/005_Activity_Tests.md, _qa/006a_Assign.md)
- Run convention: _qa/runs/README.md
- Live Quodsi LucidChart extension; you have browser control (Playwright /
  Browser Use / similar) OR a human is driving the browser and you're
  guiding by asking what they see.

PROCEDURE

1. Read the spec file end-to-end. Note the ## Scope block and any
   cross-references — some assertions are intentionally covered by another
   suite (typically 005 for auto-save, 004 for distribution input).
2. Read _qa/runs/README.md for the run-file template and naming.
3. Optionally read cross-referenced suites so you understand what NOT to
   redundantly re-flag.
4. For each test in order:
   a. Set up preconditions (open doc, select shape, pick tab, etc.)
   b. Execute the Steps verbatim
   c. Compare actual outcome against Expected
   d. Match → silent pass (write nothing — silence means pass)
   e. Mismatch → capture a Failures entry
   f. Can't run it (precondition unmeetable, feature gated, infra missing)
      → capture a Skipped entry
5. AT THE END, write ONE file at
   _qa/runs/<YYYY-MM-DD>-<runner>-<suite-id>.md
   using runs/README.md's template. Even with zero failures, still write
   the header + "## Failures None." + any "## Skipped" entries.

FAILURE ENTRY FORMAT
### <TEST-ID> — <Test name>
- Observed: what you actually saw (exact text strings, screenshot path)
- Expected: what the spec said (copy verbatim, don't paraphrase)
- Repro: reliable / intermittent (Xx of Y) / one-off
- Notes: console errors, stack traces, suspected cause

SKIPPED ENTRY FORMAT
- <TEST-ID> — short reason

GOTCHAS

- Auto-save timing: wait ~700 ms after a typed edit (500 ms debounce + buffer)
  before asserting the SaveStatusLine text. Blur is immediate.
- SaveStatusLine wording is EXACT: "Saving…" (real ellipsis char), "Saved",
  "Fix errors to save", "Save failed — keep typing to retry" (em-dash).
- Validation banners are prefixed exactly "Fix to save:".
- Loop / Branch (006j / 006k) can't be created from the dropdown — they
  need a model JSON import. If you have no such JSON, skip them all with
  one reason.
- Tests labelled "[SKIP-COMING-SOON]" or "informational" → skip with the
  spec's reason; don't try to execute.
- Element switch FLUSHES the pending edit (current behavior). The legacy
  was "discard." Don't fall back to the legacy mental model.
- States are Model-level now, not Activity-level. The Activity Editor has
  no States tab.

RULES

1. Write the report ONLY at the end, not incrementally.
2. Cite TEST-IDs exactly (e.g. ACT-AUTOSAVE-003).
3. Don't edit the spec file. Spec updates are out of scope for a run.
4. If the spec itself is wrong (UI no longer matches), record it as a
   failure with Notes: "spec out of date; UI behavior is X" — don't
   silently pass. Daniel decides whether to fix the spec or the code.
5. If you find a bug worth filing in GitHub, do that separately and link
   it in the failure's Notes.

OUTPUT
Print the full path of the run file you wrote, plus a one-line summary
("N failures, M skipped, K passed").
```

---

## Maintenance

When the extension's UI or auto-save mechanics change in a way that invalidates a gotcha above, update both this file and the corresponding suite spec(s). The two files together are the contract between the spec author and the QA agent.

Gotchas worth keeping in sync:
- Debounce timing (currently 500 ms — see `useEditorState.ts`)
- `SaveStatusLine` strings (see `SaveStatusLine.tsx`)
- Validation banner prefix (currently `Fix to save:` — see `ActivityEditor.tsx`)
- Which action types are dropdown-creatable vs JSON-import-only
- Where States live (Model-level vs Activity-level)
