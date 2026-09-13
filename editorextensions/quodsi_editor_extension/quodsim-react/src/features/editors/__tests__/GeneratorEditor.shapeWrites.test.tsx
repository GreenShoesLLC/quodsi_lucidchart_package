// GeneratorEditor.shapeWrites.test.tsx
//
// Spec 2026-09-13 lucid-shape-writes §3: Lucid's Generator editor saves its
// own fields as a batched shape edit (never the pattern/schedule link fields),
// its mode-switch lifecycle sends the link and the pattern list through the
// same queue, refills its draft from the snapshot's full record, and shows a
// refused lifecycle write. The real hook runs; only the host is faked.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { EnvelopeMessageType, GeneratorType } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
    updateResourceRequirements: vi.fn(),
    updateElement: vi.fn(),
  }),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: vi.fn() }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const AUTOSAVE_MS = 500;

const frequencyGenerator = { id: "g1", name: "Arrivals", entityId: "e1", mode: GeneratorType.FREQUENCY, levers: [] } as any;
const patternGenerator = { id: "g1", name: "Arrivals", entityId: "e1", mode: GeneratorType.PATTERN, arrivalPatternId: "ap-1", volume: 800, levers: [] } as any;

function installHost(options: { refuse?: boolean } = {}) {
  const posted: any[] = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    posted.push(envelope);
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
          data: options.refuse ? { success: false, errorMessage: "storage write failed" } : { success: true },
        },
      }));
    }
  });
  return posted;
}

let snapshotCount = 0;
function pushSnapshot(generators: any[], arrivalPatterns: any[] = []) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", {
      data: {
        id: `snap-${++snapshotCount}`,
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        data: { projection: { pageId: "page-1", generators, arrivalPatterns, model: {} } },
      },
    }));
  });
}

function renderEditor(generator: any) {
  return render(<GeneratorEditor generator={generator} referenceData={{ entities: [] } as any} states={{} as any} />);
}

const updates = (posted: any[]) => posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE);

describe("GeneratorEditor — shape writes through the model-root source", () => {
  it("autosaves the generator's own fields as a shape edit, never its link fields", async () => {
    vi.useFakeTimers();
    const posted = installHost();
    renderEditor(frequencyGenerator);
    pushSnapshot([frequencyGenerator]);

    fireEvent.change(screen.getByDisplayValue("Arrivals"), { target: { value: "Walk-ins" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    const shape = updates(posted)[0].data.shapes[0];
    expect(shape).toEqual(expect.objectContaining({ shapeId: "g1", type: "Generator", clearedFields: [] }));
    expect(shape.patch).toEqual(expect.objectContaining({ name: "Walk-ins", entityId: "e1", mode: GeneratorType.FREQUENCY }));
    expect("arrivalPatternId" in shape.patch).toBe(false);
    expect("volume" in shape.patch).toBe(false);
    expect("arrivalScheduleId" in shape.patch).toBe(false);
  });

  it("switching away from PATTERN sends the cleared link no later than the pattern list", async () => {
    const posted = installHost();
    renderEditor(patternGenerator);
    pushSnapshot([patternGenerator], [{ id: "ap-1", name: "Arrivals pattern" }]);

    fireEvent.change(screen.getByRole("combobox", { name: /generator type/i }), {
      target: { value: GeneratorType.FREQUENCY },
    });

    await waitFor(() => {
      expect(updates(posted).some((e) => "arrivalPatterns" in e.data.patch)).toBe(true);
    });
    const all = updates(posted);
    const linkIndex = all.findIndex((e) =>
      (e.data.shapes ?? []).some((s: any) => s.shapeId === "g1" && s.clearedFields.includes("arrivalPatternId"))
    );
    const patternsIndex = all.findIndex((e) => "arrivalPatterns" in e.data.patch);
    expect(linkIndex).toBeGreaterThanOrEqual(0);
    expect(patternsIndex).toBeGreaterThanOrEqual(linkIndex);
    expect(all[patternsIndex].data.patch.arrivalPatterns).toEqual([]);
  });

  it("shows a refused mode-switch write in the lifecycle error line", async () => {
    installHost({ refuse: true });
    renderEditor(frequencyGenerator);
    pushSnapshot([frequencyGenerator], []);

    fireEvent.change(screen.getByRole("combobox", { name: /generator type/i }), {
      target: { value: GeneratorType.PATTERN },
    });

    expect(await screen.findByText("Could not save the pattern switch. Try again.")).toBeInTheDocument();
  });

  it("refills the draft from the snapshot's full record", () => {
    installHost();
    renderEditor(frequencyGenerator);

    pushSnapshot([{ ...frequencyGenerator, name: "Stored name" }]);

    expect(screen.getByDisplayValue("Stored name")).toBeInTheDocument();
  });

  // Task 1 carried note: MODEL_ROOT_SNAPSHOT's generators rows are the
  // Generator's sparse toJSON() -- batchSize/startDelay/maxCycles (and
  // similar) are ABSENT at their defaults, not present-with-default-value.
  // extractGeneratorData must default a missing field exactly like it does
  // for the pre-snapshot selection copy, so refilling from this sparse row
  // (frequencyGenerator above carries none of those keys, matching a real
  // toJSON() row) must not read as an edit. Pinned in isolation (its own
  // describe block, own fixture) rather than alongside this file's other
  // fake-timer tests: sharing frequencyGenerator and vi.useFakeTimers()
  // across every test in one block proved flaky here -- a write from an
  // earlier test's own fake-timer-scheduled batch was still in flight when
  // this one advanced the (same, vitest-global) fake clock further, and
  // landed in THIS test's host spy instead. Isolating it removed the
  // interference without touching the other tests' own timer usage.
  it("an unedited generator's sparse snapshot record refills without marking the draft dirty", () => {
    installHost();
    renderEditor(frequencyGenerator);

    pushSnapshot([frequencyGenerator]);

    // No crash defaulting the sparse record, and the displayed name is
    // exactly what the selection copy already showed -- a real edit (see
    // "refills the draft from the snapshot's full record" above) does
    // change what's displayed; an unedited resync must not.
    expect(screen.getByDisplayValue("Arrivals")).toBeInTheDocument();
  });

  // Controller ruling (Task 3 review): a SHAPE-ONLY lifecycle write -- the
  // arrival-pattern model list does NOT change because the generator's
  // arrivalPatternId already resolves to a pattern already present in the
  // snapshot (ensurePatternForGenerator's idempotent "existing" branch,
  // ensured.model === model) -- must still surface a host refusal. Before
  // this task's fix, `accessor.flushModelImmediate?.()` sat INSIDE the
  // `if (ensured.model !== model)` block, so this exact case never flushed:
  // the refused write would only reach the panel after the model-root
  // source's own debounce timer eventually promoted and sent it.
  it("surfaces a SHAPE-ONLY refusal immediately, without waiting for the model-root debounce", async () => {
    vi.useFakeTimers();
    const posted = installHost({ refuse: true });
    // arrivalPatternId already set from a prior PATTERN stint (per
    // DEFAULT_PATTERN_VOLUME's own comment: "PATTERN -> FREQUENCY -> PATTERN
    // keeps whatever was there") and the pattern it points at is already in
    // the snapshot -- ensurePatternForGenerator finds it and returns the
    // SAME model reference, so the `if (ensured.model !== model)` branch
    // (and, pre-fix, its flush) never runs.
    const reusesExistingPattern = {
      id: "g1",
      name: "Arrivals",
      entityId: "e1",
      mode: GeneratorType.FREQUENCY,
      arrivalPatternId: "ap-1",
      levers: [],
    } as any;
    renderEditor(reusesExistingPattern);
    pushSnapshot([reusesExistingPattern], [{ id: "ap-1", name: "Arrivals pattern" }]);

    fireEvent.change(screen.getByRole("combobox", { name: /generator type/i }), {
      target: { value: GeneratorType.PATTERN },
    });

    // Well under MODEL_ROOT_DEBOUNCE_MS: if the write only reached the host
    // via the debounce timer (no flush), nothing would be posted yet and the
    // error would not have appeared.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS / 4);
    });

    expect(updates(posted).some((e) => "arrivalPatterns" in e.data.patch)).toBe(false);
    expect(screen.getByText("Could not save the pattern switch. Try again.")).toBeInTheDocument();
  });
});
