// GeneratorEditor.shapeWrites.test.tsx
//
// Spec 2026-09-13 lucid-shape-writes §3: Lucid's Generator editor saves its
// own fields as a batched shape edit (never the pattern/schedule link fields),
// its mode-switch lifecycle sends the link and the pattern list through the
// same queue, refills its draft from the snapshot's full record, and shows a
// refused lifecycle write. The real hook runs; only the host is faked.
//
// ISOLATION (Task 5 review fix round 1). Every fixture is a fresh object
// built by a factory called inside each test -- a module-level mutable
// fixture, shared and sometimes mutated-by-reference across tests, is what
// let one test's write bleed into another's assertions. `afterEach` unmounts
// every rendered tree (dropping each model-root source's window listener and
// unregistering it from the cross-panel flush registry), resets that
// registry, and drops any timer still scheduled (a settled-but-unreleased
// batch arms a real TAGGED_SNAPSHOT_GRACE_MS timer via `setTimeout` -- a
// leftover one, uncleared, can fire during a LATER test and land in that
// test's own host spy) before switching back to real timers.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { EnvelopeMessageType, GeneratorType } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";
import { resetModelRootWritesForTests } from "../../../adapters/modelRootWrites";
import { setView } from "quodsi_studio/platforms/shared";

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
  // Unmount FIRST: runs each rendered tree's own effect cleanup (the
  // model-root source's message listener removed, and its flush registry
  // entry unregistered) before anything else touches timers or mocks.
  cleanup();
  resetModelRootWritesForTests();
  // Clear before switching back: drops any timer still scheduled (a settled
  // batch's grace timer, or a debounce timer a test didn't advance) so it
  // cannot fire during a LATER test against whatever host spy that test
  // installs.
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setView("basic");
});

const AUTOSAVE_MS = 500;

function makeFrequencyGenerator(overrides: Record<string, unknown> = {}) {
  return { id: "g1", name: "Arrivals", entityId: "e1", mode: GeneratorType.FREQUENCY, levers: [], ...overrides } as any;
}
function makePatternGenerator(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    name: "Arrivals",
    entityId: "e1",
    mode: GeneratorType.PATTERN,
    arrivalPatternId: "ap-1",
    volume: 800,
    levers: [],
    ...overrides,
  } as any;
}

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
    const generator = makeFrequencyGenerator();
    renderEditor(generator);
    pushSnapshot([generator]);

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
    const generator = makePatternGenerator();
    renderEditor(generator);
    pushSnapshot([generator], [{ id: "ap-1", name: "Arrivals pattern" }]);

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
    const generator = makeFrequencyGenerator();
    renderEditor(generator);
    pushSnapshot([generator], []);

    fireEvent.change(screen.getByRole("combobox", { name: /generator type/i }), {
      target: { value: GeneratorType.PATTERN },
    });

    expect(await screen.findByText("Could not save the pattern switch. Try again.")).toBeInTheDocument();
  });

  it("refills the draft from the snapshot's full record", () => {
    installHost();
    const generator = makeFrequencyGenerator();
    renderEditor(generator);

    pushSnapshot([{ ...generator, name: "Stored name" }]);

    expect(screen.getByDisplayValue("Stored name")).toBeInTheDocument();
  });

  // Task 1 carried note: MODEL_ROOT_SNAPSHOT's generators rows are the
  // Generator's sparse toJSON() -- batchSize/startDelay/maxCycles (and
  // similar) are ABSENT at their defaults, not present-with-default-value.
  // extractGeneratorData must default a missing field exactly like it does
  // for the pre-snapshot selection copy, so refilling from this sparse row
  // must not read as an edit and fire a spurious autosave.
  it("an unedited generator's sparse snapshot record produces the same defaults with no spurious autosave", async () => {
    // generator.field.advanced (the Advanced Settings section, where
    // Entities Per / Periodic Occurrences / Max Entities live) is
    // intermediate+ -- see GeneratorEditor.tsx's own ViewGated comment.
    setView("intermediate");
    vi.useFakeTimers();
    const posted = installHost();
    // No batchSize/startDelay/maxCycles/initialStates/routing keys at all --
    // exactly the sparse shape a real toJSON() row has at defaults.
    const sparseGenerator = makeFrequencyGenerator();
    const { container } = renderEditor(sparseGenerator);
    pushSnapshot([sparseGenerator]);

    fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }));

    // Step 2: the drawn values are exactly extractGeneratorData's defaults --
    // proof the sparse row was defaulted the same way the pre-snapshot
    // selection copy already was, not read as a live edit.
    expect((container.querySelector('input[name="entitiesPerCreation"]') as HTMLInputElement).value).toBe("1");
    expect((container.querySelector('input[name="periodicOccurrences"]') as HTMLInputElement).value).toBe("999999");
    expect((container.querySelector('input[name="maxEntities"]') as HTMLInputElement).value).toBe("999999");

    // Step 3: well past both the 500ms autosave debounce and the 400ms
    // model-root source pause.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + MODEL_ROOT_DEBOUNCE_MS + 100);
    });

    // Step 4: no shape write for this generator went out at all.
    expect(
      updates(posted).some((e) => (e.data.shapes ?? []).some((s: any) => s.shapeId === sparseGenerator.id))
    ).toBe(false);
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
    const reusesExistingPattern = makeFrequencyGenerator({ arrivalPatternId: "ap-1" });
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

  // Final review I2: the editor's `isSaving` is the source's combined status,
  // true through the source's own 0.4 s pause after every autosave, and a
  // blur must still push the newest draft into the source then.
  it("a blur while the source holds the previous autosave sends the last typed value", async () => {
    vi.useFakeTimers();
    const posted = installHost();
    const generator = makeFrequencyGenerator();
    renderEditor(generator);
    pushSnapshot([generator]);

    const name = screen.getByDisplayValue("Arrivals");
    fireEvent.change(name, { target: { value: "Walk-ins A" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    });
    fireEvent.change(name, { target: { value: "Walk-ins AB" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(updates(posted)).toHaveLength(0);

    fireEvent.blur(name);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    const names = updates(posted).flatMap((e) =>
      (e.data.shapes ?? []).filter((s: any) => s.shapeId === "g1").map((s: any) => s.patch.name)
    );
    expect(names).toEqual(["Walk-ins AB"]);
  });
});
