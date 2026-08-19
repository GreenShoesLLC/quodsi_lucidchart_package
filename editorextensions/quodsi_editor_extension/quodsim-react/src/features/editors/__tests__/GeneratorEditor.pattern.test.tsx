import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType } from "@quodsi/lucid-shared";

// Hoisted so the "populated projection" describe block below can assert on
// calls made to updateElementData -- a plain `() => ({ updateElementData:
// vi.fn() })` factory hands back a FRESH vi.fn() on every call (GeneratorEditor
// calls useModelOpsSender() itself, AND useModelRootSource() now calls it a
// second time internally to reach the shape-scoped save route -- Task 10
// review, Critical 2), so a non-hoisted mock can't be inspected from outside
// the component. vi.hoisted keeps ONE stable reference both call sites share.
const { mockUpdateElementData, mockSelectElement } = vi.hoisted(() => ({
  mockUpdateElementData: vi.fn(),
  mockSelectElement: vi.fn(),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
    updateElementData: mockUpdateElementData,
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
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
  useMessaging: () => ({ app: { panelType: "model" } }),
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
  onSave: vi.fn(),
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
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
 * answers MODEL_ROOT_REQUEST / MODEL_ROOT_UPDATE / ELEMENT_UPDATE the same
 * way the real extension does (modelRootHandler.ts / elementOpsHandler.ts),
 * closely enough to exercise the split-brain race (Task 10 review round 3)
 * and its fix: an ELEMENT_UPDATE never pushes its own MODEL_ROOT_SNAPSHOT,
 * a MODEL_ROOT_UPDATE's post-write snapshot reflects whatever this fake
 * "shape storage" currently holds, and ELEMENT_UPDATE's own confirmation
 * (ELEMENT_UPDATE_RESULT) can be delayed to reproduce "the shape write
 * hadn't landed yet when the model-root snapshot was built."
 *
 * Register with `vi.spyOn(window.parent, 'postMessage').mockImplementation
 * ((envelope) => fakeHost.handlePostMessage(envelope))`.
 */
function createFakeHost(options: { elementUpdateDelayMs?: number } = {}) {
  const elementUpdateDelayMs = options.elementUpdateDelayMs ?? 0;
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

  function applyElementUpdate(envelope: any) {
    const idx = generators.findIndex((g) => g.id === envelope.data.elementId);
    if (idx >= 0) {
      const incoming = envelope.data.data ?? {};
      const cleared: string[] = incoming.__clearedFields ?? [];
      const merged: any = { ...generators[idx] };
      for (const [k, v] of Object.entries(incoming)) {
        if (k === "__clearedFields" || v === undefined) continue;
        merged[k] = v;
      }
      for (const key of cleared) delete merged[key];
      generators[idx] = merged;
    }
    dispatch({
      id: envelope.id,
      type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
      source: "host",
      target: "model-iframe",
      version: "1.0",
      data: { success: true, elementId: envelope.data.elementId },
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
      dispatch({
        id: envelope.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: "host",
        target: "model-iframe",
        version: "1.0",
        data: { success: true },
      });
      // Mirrors modelRootHandler.ts's handleUpdate: pushes its own
      // post-write snapshot, built from whatever this fake "shape storage"
      // holds AT THIS MOMENT -- which is stale if a same-generator
      // ELEMENT_UPDATE is still delayed/in flight.
      pushSnapshot(envelope.id);
      return;
    }
    if (envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE) {
      if (elementUpdateDelayMs > 0) {
        setTimeout(() => applyElementUpdate(envelope), elementUpdateDelayMs);
      } else {
        applyElementUpdate(envelope);
      }
      return;
    }
  }

  return { handlePostMessage, snapshot, setInitial };
}

describe("GeneratorEditor PATTERN mode", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
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

  it("opens the pattern modal from the button", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));
    expect(
      screen.getByRole("dialog", { name: /arrival pattern/i })
    ).toBeInTheDocument();
  });

  it("still shows the SCHEDULED read-only notice unchanged (byte-unchanged branch, sanity check)", () => {
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

    expect(screen.getByText(/Scheduled Arrival generator/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Quodsi Studio or the drawio extension/i)
    ).toBeInTheDocument();
    // SCHEDULED still has no dropdown and no Edit pattern button.
    expect(
      screen.queryByRole("combobox", { name: /generator type/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit pattern/i })
    ).not.toBeInTheDocument();
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

    // The generator-half patch (mode + arrivalPatternId + volume) persists
    // through the shape-scoped route (a real ELEMENT_UPDATE envelope, not
    // silently dropped), and arrivalPatterns persists through exactly one
    // MODEL_ROOT_UPDATE with exactly one new pattern.
    await waitFor(() => {
      expect(fakeHost.snapshot().arrivalPatterns).toHaveLength(1);
    });

    const elementUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE
    );
    expect(elementUpdateCalls).toHaveLength(1);
    const patch = (elementUpdateCalls[0][0] as any).data.data;
    expect(patch.mode).toBe(GeneratorType.PATTERN);
    expect(typeof patch.arrivalPatternId).toBe("string");
    expect(patch.arrivalPatternId.length).toBeGreaterThan(0);
    expect(patch.volume).toBeGreaterThan(0);

    const modelRootUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    expect(modelRootUpdateCalls).toHaveLength(1);
    const rootPatch = (modelRootUpdateCalls[0][0] as any).data.patch;
    expect(rootPatch.arrivalPatterns).toHaveLength(1);
    expect(rootPatch.arrivalPatterns[0].id).toBe(patch.arrivalPatternId);

    // The fake host's own generator record ends up linked too -- the exact
    // invariant Critical 1 restores (previously only the model-root half
    // persisted).
    expect(fakeHost.snapshot().generators[0].arrivalPatternId).toBe(patch.arrivalPatternId);
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

    // The shape-half write still fires (mode really did change), reusing
    // the EXISTING pattern id rather than minting a new one.
    await waitFor(() => {
      const calls = postMessageSpy.mock.calls.filter(
        ([envelope]: any) => envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE
      );
      expect(calls).toHaveLength(1);
    });
    const elementUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE
    );
    const patch = (elementUpdateCalls[0][0] as any).data.data;
    expect(patch.arrivalPatternId).toBe("ap-existing");

    // No model-root write at all -- ensured.model === model (unchanged), so
    // the `ensured.model !== model` guard skips the write entirely. A
    // duplicate pattern would show up here as a second MODEL_ROOT_UPDATE
    // carrying two arrivalPatterns entries; there is none, and the fake
    // host still holds exactly the one pattern it started with.
    const modelRootUpdateCalls = postMessageSpy.mock.calls.filter(
      ([envelope]: any) => envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    expect(modelRootUpdateCalls).toHaveLength(0);
    expect(fakeHost.snapshot().arrivalPatterns).toHaveLength(1);
  });
});

// Task 10 review round 3 -- Important: "split-brain projection". Every test
// above either never dispatches a snapshot, or dispatches exactly one before
// the ONE mode switch under test -- none of them exercise a SECOND lifecycle
// decision reading the projection a first switch just wrote. This is the
// required regression test: PATTERN -> FREQUENCY -> PATTERN in one mount,
// with the fake host's ELEMENT_UPDATE confirmation deliberately DELAYED
// (elementUpdateDelayMs) relative to MODEL_ROOT_UPDATE's own handling -- the
// exact ordering the review described ("buildModelRootProjection reads
// shape storage that may not have landed yet"). Against the PRE-FIX code
// (parallel writes, saveShape resolving the instant the message was sent),
// this reproduces the reported bug: switch 1's post-write snapshot shows
// the new pattern in arrivalPatterns but NOT linked from the generator;
// switch 2 (away from PATTERN) reads that stale projection, finds no link,
// and silently no-ops instead of deleting the pattern (orphan); switch 3
// (back to PATTERN) mints a SECOND pattern. Against the fix (saveShape
// awaits the real ELEMENT_UPDATE_RESULT before the model-root write fires,
// and re-requests a snapshot on confirmed success), each switch's decision
// is made against a projection that already reflects the previous switch's
// full effect, and the sequence ends with exactly one pattern, correctly
// linked.
describe("GeneratorEditor PATTERN mode — PATTERN -> FREQUENCY -> PATTERN in one mount (split-brain projection)", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
  });

  it("ends with exactly one pattern and no orphan after PATTERN -> FREQUENCY -> PATTERN", async () => {
    // Deliberately longer than a same-tick race would need, to reliably
    // simulate "the model-root write's own snapshot push runs BEFORE the
    // shape write has landed" against the pre-fix code, without relying on
    // exact microtask ordering.
    const fakeHost = createFakeHost({ elementUpdateDelayMs: 20 });
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
