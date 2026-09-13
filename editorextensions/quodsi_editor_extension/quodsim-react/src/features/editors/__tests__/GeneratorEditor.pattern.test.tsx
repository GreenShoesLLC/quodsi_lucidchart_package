import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType, DEFAULT_MODAL_SIZE } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";

// Hoisted so the "populated projection" describe block below can assert on
// calls made to updateElementData -- a plain `() => ({ updateElementData:
// vi.fn() })` factory hands back a FRESH vi.fn() on every call (GeneratorEditor
// calls useModelOpsSender() itself, AND useModelRootSource() now calls it a
// second time internally to reach the shape-scoped save route -- Task 10
// review, Critical 2), so a non-hoisted mock can't be inspected from outside
// the component. vi.hoisted keeps ONE stable reference both call sites share.
//
// mockSendMessage: Task 4 -- "Edit pattern" now sends OPEN_PATTERN_MODAL via
// useSimulationRunSender -> useSender -> useMessaging().sendMessage, rather
// than opening an in-panel modal. Wired into the useMessaging mock below
// (real useSender/useSimulationRunSender run, so getModalSizePref's real
// read is exercised too) so tests can assert on the envelope's type/data.
const { mockUpdateElementData, mockSelectElement, mockSendMessage } = vi.hoisted(() => ({
  mockUpdateElementData: vi.fn(),
  mockSelectElement: vi.fn(),
  mockSendMessage: vi.fn(),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
    updateElementData: mockUpdateElementData,
    updateResourceRequirements: vi.fn(),
    updateElement: vi.fn(),
  }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// GeneratorEditor now calls useModelRootSource() directly (Task 10 -- the
// hook is NOT threaded down as a prop from ElementEditor), which talks to
// the extension host via useMessaging()'s panelType plus window.postMessage.
// Mock useMessaging the same way useModelRootSourceHook.test.tsx does; the
// hook's own postMessage plumbing still runs for real against jsdom's
// window.
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

function patternGenerator() {
  return {
    id: "g1",
    name: "Arrivals",
    mode: GeneratorType.PATTERN,
    arrivalPatternId: "ap-1",
    volume: 8500,
    levers: [],
  } as any;
}

const baseProps = {
  referenceData: { entities: [] } as any,
  states: {} as any,
};

/** Simulates the host pushing a MODEL_ROOT_SNAPSHOT (unsolicited, or in
 *  reply to the request useModelRootSource fires on mount) -- the same
 *  technique useModelRootSourceHook.test.tsx uses. */
// window.parent.postMessage is spied on (not replaced by a module mock), so
// without an explicit restore between tests, vi.spyOn on an already-spied
// method hands back the SAME spy instance -- its .mock.calls would then
// accumulate across every test in this file that spies on it, corrupting
// call-count assertions in a LATER test with an EARLIER test's leftover
// calls. Real bug hit while writing the "does not append a duplicate" test
// below: it failed with an unexplained extra call that was actually the
// preceding test's MODEL_ROOT_UPDATE, not a real duplicate.
afterEach(() => {
  vi.restoreAllMocks();
});

function dispatchSnapshot(projection: Record<string, unknown>) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: "snapshot-push",
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          source: "host",
          target: "model-iframe",
          version: "1.0",
          data: { projection },
        },
      })
    );
  });
}

/**
 * A minimal in-memory "host": tracks generators + arrivalPatterns and
 * answers MODEL_ROOT_REQUEST / MODEL_ROOT_UPDATE the same way the real
 * extension does (modelRootHandler.ts). Task 3 (spec 2026-09-13
 * lucid-shape-writes §2) folded the generator-half shape write into the
 * SAME MODEL_ROOT_UPDATE as the arrivalPatterns write -- both halves are
 * applied here before the one post-write snapshot is pushed, which is what
 * makes the split-brain race this file used to reproduce via a delayed
 * ELEMENT_UPDATE (Task 10 review round 3) structurally impossible now: there
 * is no second, separately-timed envelope for the shape half any more --
 * there is no ELEMENT_UPDATE branch left to delay.
 *
 * Register with `vi.spyOn(window.parent, 'postMessage').mockImplementation
 * ((envelope) => fakeHost.handlePostMessage(envelope))`.
 */
function createFakeHost() {
  let generators: any[] = [];
  let arrivalPatterns: any[] = [];

  function setInitial(gens: any[], patterns: any[]) {
    generators = gens.map((g) => ({ ...g }));
    arrivalPatterns = patterns.map((p) => ({ ...p }));
  }

  function snapshot() {
    return {
      generators: generators.map((g) => ({ ...g })),
      arrivalPatterns: arrivalPatterns.map((p) => ({ ...p })),
      model: {},
    };
  }

  function dispatch(data: any) {
    window.dispatchEvent(new MessageEvent("message", { data }));
  }

  function pushSnapshot(correlationId: string) {
    dispatch({
      id: correlationId,
      type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
      source: "host",
      target: "model-iframe",
      version: "1.0",
      data: { projection: snapshot() },
    });
  }

  function handlePostMessage(envelope: any) {
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST) {
      pushSnapshot(envelope.id);
      return;
    }
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      const patch = envelope.data?.patch ?? {};
      if (patch.arrivalPatterns) arrivalPatterns = patch.arrivalPatterns;
      // Spec 2026-09-13 lucid-shape-writes §2: Task 3 routes every
      // Activity/Generator accessor.updateShape into the SAME batched
      // MODEL_ROOT_UPDATE as model-root edits, carried as `data.shapes`
      // (shapeId/type/patch/clearedFields) -- there is no separate
      // ELEMENT_UPDATE for a generator write any more. Apply them to this
      // fake "shape storage" the same way the real host's element-update
      // merge does, then include them in the SAME post-write snapshot push
      // as the arrivalPatterns half -- exactly what makes the split-brain
      // race (below) impossible now: one envelope, one snapshot, both
      // halves landed together.
      const shapes = envelope.data?.shapes ?? [];
      for (const shape of shapes) {
        if (shape.type !== "Generator") continue;
        const idx = generators.findIndex((g) => g.id === shape.shapeId);
        if (idx >= 0) {
          const merged: any = { ...generators[idx], ...shape.patch };
          for (const key of shape.clearedFields ?? []) delete merged[key];
          generators[idx] = merged;
        }
      }
      dispatch({
        id: envelope.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: "host",
        target: "model-iframe",
        version: "1.0",
        data: { success: true },
      });
      pushSnapshot(envelope.id);
      return;
    }
  }

  return { handlePostMessage, snapshot, setInitial };
}

describe("GeneratorEditor PATTERN mode", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("offers PATTERN in the generator type dropdown", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    const select = screen.getByRole("combobox", { name: /generator type/i });
    expect(select).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /arrival pattern/i })
    ).toBeInTheDocument();
  });

  it("shows a pattern summary instead of the old read-only notice", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    expect(
      screen.queryByText(/authored in Quodsi Studio or the drawio extension/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit pattern/i })
    ).toBeInTheDocument();
  });

  it("shows a loading placeholder (not a confident wrong summary) while no snapshot has arrived", () => {
    // No dispatchSnapshot call in this test -- modelRootProjection stays
    // null for its whole lifetime, matching every other test in this
    // top-level describe block. Minor 6 (Task 10 review): summarizing
    // against an empty/undefined pattern here would report "spread evenly"
    // for a pattern whose real shape (season/week/day weights) is unknown --
    // the right volume, an invented shape.
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    expect(screen.getByText(/Loading pattern/i)).toBeInTheDocument();
    expect(screen.queryByText(/arrivals per/i)).not.toBeInTheDocument();
  });

  it("asks the host to open the pattern modal, with the shape id and the modal size preference", () => {
    // Task 4: the panel no longer draws the editor inline -- clicking "Edit
    // pattern" sends OPEN_PATTERN_MODAL (handled by modelRootHandler.ts) so
    // the host opens a real Lucid modal over the whole application instead.
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_PATTERN_MODAL,
      { shapeId: "g1", modalSize: DEFAULT_MODAL_SIZE }
    );
    // And no in-panel dialog renders -- that surface is gone.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Task 4: SCHEDULED got the same treatment PATTERN got in Task 10 -- the
  // old read-only notice is gone, replaced by a summary + "Edit schedule"
  // button, and SCHEDULED is back on the type dropdown. This test used to
  // assert the notice "unchanged" as a sanity check that the PATTERN work
  // hadn't touched the SCHEDULED branch; now it asserts the SCHEDULED
  // branch's own new behaviour instead.
  it("shows a schedule summary and dropdown instead of the old read-only notice", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-scheduled",
          name: "Appointments",
          mode: GeneratorType.SCHEDULED,
          arrivalScheduleId: "as-456",
          levers: [],
        } as any}
      />
    );

    expect(screen.queryByText(/Scheduled Arrival generator/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Quodsi Studio or the drawio extension/i)
    ).not.toBeInTheDocument();
    // SCHEDULED is selectable again, like PATTERN, and gets its own launcher.
    expect(
      screen.getByRole("combobox", { name: /generator type/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit schedule/i })
    ).toBeInTheDocument();
    // No snapshot dispatched in this describe block -- modelRootProjection
    // stays null, same as the PATTERN "Loading pattern…" case above.
    expect(screen.getByText(/Loading schedule/i)).toBeInTheDocument();
  });
});

// Task 10 review, Important 5: the old (deleted) read-only-notice test
// asserted the pattern id and "Volume: 500" were displayed; that coverage
// was dropped with no replacement. This restores an equivalent assertion
// against the new summary surface, with a POPULATED projection so
// summarizeArrivalPattern runs for real (not the "Loading pattern…"
// placeholder every test above deliberately stays under).
describe("GeneratorEditor PATTERN mode — summary reflects a populated projection", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("renders the linked pattern's volume once a snapshot has arrived", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-summary",
          name: "Arrivals",
          mode: GeneratorType.PATTERN,
          arrivalPatternId: "ap-summary",
          volume: 500,
          levers: [],
        } as any}
      />
    );

    dispatchSnapshot({
      generators: [
        { id: "g-summary", name: "Arrivals", mode: "pattern", arrivalPatternId: "ap-summary", volume: 500 },
      ],
      arrivalPatterns: [{ id: "ap-summary", name: "Arrivals pattern" }],
      model: {},
    });

    expect(screen.queryByText(/Loading pattern/i)).not.toBeInTheDocument();
    expect(screen.getByText(/500 arrivals/i)).toBeInTheDocument();
  });
});

// Task 10 review, Important 4: every test above mocks useMessaging so no
// snapshot ever arrives -- projection stays null for the whole suite, and
// NO lifecycle branch (ensurePatternForGenerator / removePatternForGenerator
// / the accessor.updateShape generator-half write) ever executes anywhere in
// the pre-fix suite. These tests supply a real, populated projection via
// dispatchSnapshot and assert the actual round trip: the pattern is
// created, the generator-half patch carries arrivalPatternId (via the
// shape-scoped route, Critical 2's fix), and a generator whose model
// snapshot already shows a linked pattern does NOT get a second one
// (ensurePatternForGenerator's idempotency, guarded by the
// `ensured.model !== model` check -- Important 3).
describe("GeneratorEditor PATTERN mode — switch-to-PATTERN lifecycle round trip", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("creates a new pattern, links it via arrivalPatternId, and seeds a default volume", async () => {
    const fakeHost = createFakeHost();
    fakeHost.setInitial([{ id: "g1", name: "Arrivals", mode: "frequency" }], []);
    const postMessageSpy = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation((envelope: any) => {
        fakeHost.handlePostMessage(envelope);
      });

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.FREQUENCY, levers: [] } as any}
      />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });

    // The generator-half patch (mode + arrivalPatternId + volume) and the
    // new arrivalPatterns entry now travel on the SAME MODEL_ROOT_UPDATE
    // (spec 2026-09-13 lucid-shape-writes §2) -- not a separate ELEMENT_UPDATE
    // envelope, and not silently dropped.
    await waitFor(() => {
      expect(fakeHost.snapshot().arrivalPatterns).toHaveLength(1);
    });

    expect(
      postMessageSpy.mock.calls.filter(
        ([envelope]: any) => envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE
      )
    ).toHaveLength(0);

    const modelRootUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    expect(modelRootUpdateCalls).toHaveLength(1);
    const envelopeData = (modelRootUpdateCalls[0][0] as any).data;
    const shapeWrite = envelopeData.shapes.find((s: any) => s.shapeId === "g1");
    expect(shapeWrite.type).toBe("Generator");
    expect(shapeWrite.patch.mode).toBe(GeneratorType.PATTERN);
    expect(typeof shapeWrite.patch.arrivalPatternId).toBe("string");
    expect(shapeWrite.patch.arrivalPatternId.length).toBeGreaterThan(0);
    expect(shapeWrite.patch.volume).toBeGreaterThan(0);

    expect(envelopeData.patch.arrivalPatterns).toHaveLength(1);
    expect(envelopeData.patch.arrivalPatterns[0].id).toBe(shapeWrite.patch.arrivalPatternId);

    // The fake host's own generator record ends up linked too -- the exact
    // invariant Critical 1 restores (previously only the model-root half
    // persisted).
    expect(fakeHost.snapshot().generators[0].arrivalPatternId).toBe(shapeWrite.patch.arrivalPatternId);
  });

  it("does not append a duplicate pattern when the model already links this generator to one (idempotency)", async () => {
    const fakeHost = createFakeHost();
    // The component's own `generator` prop still says FREQUENCY (e.g. its
    // own shape-data fetch hasn't round-tripped yet), but the model-root
    // snapshot already shows this generator linked to an EXISTING pattern --
    // exactly the state ensurePatternForGenerator's "existing" branch
    // (arrivalPatternLifecycle.ts) is built to recognize and leave alone.
    fakeHost.setInitial(
      [{ id: "g1", name: "Arrivals", mode: "frequency", arrivalPatternId: "ap-existing" }],
      [{ id: "ap-existing", name: "Arrivals pattern" }]
    );
    const postMessageSpy = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation((envelope: any) => {
        fakeHost.handlePostMessage(envelope);
      });

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.FREQUENCY, levers: [] } as any}
      />
    );

    // The fake host answers MODEL_ROOT_REQUEST (sent from the mount effect)
    // synchronously, and MODEL_ROOT_SNAPSHOT is delivered by dispatching a
    // "message" event directly -- not another window.parent.postMessage
    // call -- so by the time render() returns, the projection is already
    // populated; no wait needed here.
    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });

    // The shape-half write still fires (mode really did change), reusing the
    // EXISTING pattern id rather than minting a new one -- now on
    // MODEL_ROOT_UPDATE's `shapes` (spec 2026-09-13 lucid-shape-writes §2),
    // not a separate ELEMENT_UPDATE envelope.
    await waitFor(() => {
      const calls = postMessageSpy.mock.calls.filter(
        ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
      );
      expect(calls).toHaveLength(1);
    });
    expect(
      postMessageSpy.mock.calls.filter(
        ([envelope]: any) => envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE
      )
    ).toHaveLength(0);

    const modelRootUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    const envelopeData = (modelRootUpdateCalls[0][0] as any).data;
    const shapeWrite = envelopeData.shapes.find((s: any) => s.shapeId === "g1");
    expect(shapeWrite.patch.arrivalPatternId).toBe("ap-existing");

    // No arrivalPatterns change on this envelope -- ensured.model === model
    // (unchanged), so the `ensured.model !== model` guard skips the
    // model-root half of the write entirely; only the shape half queues and
    // sends. A duplicate pattern would show up here as an arrivalPatterns
    // entry carrying two entries; there is none, and the fake host still
    // holds exactly the one pattern it started with.
    expect(envelopeData.patch.arrivalPatterns).toBeUndefined();
    expect(fakeHost.snapshot().arrivalPatterns).toHaveLength(1);
  });
});

// Controller ruling (Task 3 review, carried into Task 5): the switch-away
// clear has to be verifiable against a host that actually removes the field
// -- not just a wire assertion that clearedFields NAMED it -- otherwise the
// "genuine" bar isn't met. createFakeHost's MODEL_ROOT_UPDATE branch already
// applies `shape.clearedFields` by deleting those keys from its own
// generator record (see its own comment above), which is what makes the
// round-trip assertion below a real check rather than a restatement of the
// envelope shape.
describe("GeneratorEditor PATTERN mode — switch-away-from-PATTERN lifecycle round trip", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("removes the generator's arrivalPatternId and drops the now-orphaned pattern", async () => {
    const fakeHost = createFakeHost();
    fakeHost.setInitial(
      [{ id: "g1", name: "Arrivals", mode: "pattern", arrivalPatternId: "ap-1" }],
      [{ id: "ap-1", name: "Arrivals pattern" }]
    );
    vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
      fakeHost.handlePostMessage(envelope);
    });

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.PATTERN, arrivalPatternId: "ap-1", levers: [] } as any}
      />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.FREQUENCY } });

    await waitFor(() => {
      expect(fakeHost.snapshot().arrivalPatterns).toHaveLength(0);
    });

    // The generator record itself no longer carries the key at all -- this
    // is only true because the fake host actually deletes it on a cleared
    // field, not merely because the wire declared it cleared.
    expect("arrivalPatternId" in fakeHost.snapshot().generators[0]).toBe(false);
  });
});

// Task 10 review round 3 -- Important: "split-brain projection". Every test
// above either never dispatches a snapshot, or dispatches exactly one before
// the ONE mode switch under test -- none of them exercise a SECOND lifecycle
// decision reading the projection a first switch just wrote. This is the
// required regression test: PATTERN -> FREQUENCY -> PATTERN in one mount.
//
// Migrated for spec 2026-09-13 lucid-shape-writes §2 (Task 3): the original
// version reproduced the race via a fake host that deliberately DELAYED its
// ELEMENT_UPDATE confirmation relative to MODEL_ROOT_UPDATE's own handling,
// simulating "buildModelRootProjection reads shape storage that may not have
// landed yet" against the pre-batching code (parallel writes, saveShape
// resolving the instant the message was sent). Task 3 removes that seam
// altogether: the generator-half write and the arrivalPatterns write now
// always travel on ONE MODEL_ROOT_UPDATE envelope (`shapes` alongside
// `patch`), so there is no second, independently-timed write left to delay
// -- the fake host here has no ELEMENT_UPDATE branch to delay any more. The
// regression this test pins is unchanged: the sequence ends with exactly one
// pattern, correctly linked, no orphan.
describe("GeneratorEditor PATTERN mode — PATTERN -> FREQUENCY -> PATTERN in one mount (split-brain projection)", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("ends with exactly one pattern and no orphan after PATTERN -> FREQUENCY -> PATTERN", async () => {
    const fakeHost = createFakeHost();
    fakeHost.setInitial([{ id: "g1", name: "Arrivals", mode: "frequency" }], []);
    vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
      fakeHost.handlePostMessage(envelope);
    });

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.FREQUENCY, levers: [] } as any}
      />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });

    // Switch 1: FREQUENCY -> PATTERN.
    await act(async () => {
      fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Switch 2: PATTERN -> FREQUENCY.
    await act(async () => {
      fireEvent.change(select, { target: { value: GeneratorType.FREQUENCY } });
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Switch 3: FREQUENCY -> PATTERN again.
    await act(async () => {
      fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    const final = fakeHost.snapshot();
    expect(final.arrivalPatterns).toHaveLength(1);
    expect(final.generators[0].arrivalPatternId).toBe(final.arrivalPatterns[0].id);
  });
});

// Finding F3 (final review, model-root batching): the PATTERN mode-switch's
// `await accessor.flushModelImmediate?.()` right after `updateModel` is what
// makes the arrivalPatterns write reach the host in the same breath as the
// shape-half write, rather than sitting in the model-root source's own 400ms
// batching window (MODEL_ROOT_DEBOUNCE_MS) with everything else. Nothing
// above proves that line does anything: every round-trip test in this file
// waits well past the debounce (150ms real-time waits, or `waitFor` with no
// timeout ceiling), so a version of GeneratorEditor.tsx with the flush lines
// deleted would still pass every one of them, just slower. This test checks
// the write lands well UNDER the debounce window instead.
describe("GeneratorEditor PATTERN mode — mode-switch flush (spec 2026-09-12 lucid-model-root-batching)", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  it("posts the arrivalPatterns MODEL_ROOT_UPDATE without waiting for the model-root debounce", async () => {
    const fakeHost = createFakeHost();
    fakeHost.setInitial([{ id: "g1", name: "Arrivals", mode: "frequency" }], []);
    const postMessageSpy = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation((envelope: any) => {
        fakeHost.handlePostMessage(envelope);
      });

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.FREQUENCY, levers: [] } as any}
      />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });
    await act(async () => {
      fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });
      // Well under MODEL_ROOT_DEBOUNCE_MS -- if the write only reached the
      // host via the debounce timer, this would see nothing yet.
      await new Promise((resolve) => setTimeout(resolve, MODEL_ROOT_DEBOUNCE_MS / 4));
    });

    const modelRootUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    expect(modelRootUpdateCalls).toHaveLength(1);
    expect((modelRootUpdateCalls[0][0] as any).data.patch.arrivalPatterns).toHaveLength(1);
  });
});
