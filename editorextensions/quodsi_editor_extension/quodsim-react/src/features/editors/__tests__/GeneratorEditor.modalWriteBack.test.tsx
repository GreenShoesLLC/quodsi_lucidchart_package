import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType } from "@quodsi/lucid-shared";

/**
 * The panel writing back over the modal's edit.
 *
 * THE FAILURE THIS ORIGINALLY PINNED (pre spec 2026-09-13 lucid-shape-writes).
 * The arrival-pattern modal owns `volume`; the panel owns everything else,
 * and its autosave used to write the WHOLE Generator every time
 * (updateGeneratorImmutably carried volume/arrivalPatternId forward).
 * useFormSync only re-synced the draft when the SELECTED ELEMENT changed, so
 * fresh data for the element already open was ignored -- and the next panel
 * edit (a rename, say) saved the pre-modal volume straight back over the
 * modal's write. Silent data loss.
 *
 * SINCE TASK 5 (spec 2026-09-13 lucid-shape-writes §3): the panel's autosave
 * (generatorShapePatch) structurally never carries volume/arrivalPatternId --
 * those are the mode-switch lifecycle's and the pattern/schedule modals' to
 * write. So the clobber above can no longer happen via the autosave path at
 * all; these tests now pin (a) that guarantee holding through a real save,
 * and (b) that the modal's own write -- delivered as a MODEL_ROOT_SNAPSHOT,
 * the same route accessor.updateShape's queued write produces once the host
 * confirms it -- reaches the panel's draft (and its summary) without a
 * deselect/reselect round trip, and survives a half-typed edit in progress.
 */

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

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

/**
 * These tests deliberately do NOT mock ../hooks/useEditorState: the whole
 * point is the interaction between the real useFormSync and the real
 * useAutoSave (most sibling GeneratorEditor suites stub that module out).
 */

const baseProps = {
  referenceData: { entities: [] } as any,
  states: {} as any,
};

function patternGenerator(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    name: "Arrivals",
    mode: GeneratorType.PATTERN,
    arrivalPatternId: "ap-1",
    volume: 8500,
    levers: [],
    ...overrides,
  } as any;
}

function installHost() {
  const posted: any[] = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    posted.push(envelope);
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
          data: { success: true },
        },
      }));
    }
  });
  return posted;
}

/** Simulates the host pushing a MODEL_ROOT_SNAPSHOT -- the route a modal's
 *  own accessor.updateShape write now produces once the host confirms it
 *  (spec 2026-09-13 lucid-shape-writes §3), replacing this file's old
 *  "rerender with new props" stand-in for "the modal wrote". */
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

afterEach(() => {
  vi.restoreAllMocks();
  mockUpdateElementData.mockClear();
  mockSelectElement.mockClear();
  mockSendMessage.mockClear();
});

describe("GeneratorEditor — the panel must not write back over the modal's edit", () => {
  it("never resends the modal's volume/arrivalPatternId when the panel saves an unrelated edit", async () => {
    const posted = installHost();
    render(<GeneratorEditor {...baseProps} generator={patternGenerator()} />);

    // The modal wrote volume 9000 (via its own accessor.updateShape) and the
    // host's tagged snapshot landed -- the panel adopts it into its draft.
    dispatchSnapshot({
      generators: [patternGenerator({ volume: 9000 })],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });
    await waitFor(() => expect(screen.getByText(/9,000 arrivals/)).toBeInTheDocument());

    // Now the user edits a field the PANEL owns.
    const nameInput = screen.getByPlaceholderText(/enter generator name/i);
    fireEvent.change(nameInput, { target: { name: "name", value: "Arrivals v2" } });
    fireEvent.blur(nameInput);

    // The panel's own save and the pattern-rename write (fired by the same
    // name edit) can land in separate batches -- find the one carrying the
    // shape edit specifically, rather than assuming it is the first
    // MODEL_ROOT_UPDATE observed.
    await waitFor(() => {
      expect(posted.some((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE && e.data.shapes)).toBe(true);
    });
    const update = posted.find((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE && e.data.shapes);
    const shape = update.data.shapes.find((s: any) => s.shapeId === "g1");
    expect(shape.patch.name).toBe("Arrivals v2");
    // Structural guarantee (generatorShapePatch): the autosave never carries
    // these keys at all, so it can never clobber the modal's write with a
    // stale copy -- this replaces the old "resent volume equals 9000, not
    // 8500" assertion, which pinned the same guarantee through a field this
    // patch shape has since made impossible to regress the old way.
    expect("volume" in shape.patch).toBe(false);
    expect("arrivalPatternId" in shape.patch).toBe(false);

    // The modal's volume is still what the draft shows -- unaffected by the
    // panel's own save.
    expect(screen.getByText(/9,000 arrivals/)).toBeInTheDocument();
  });

  it("shows the modal's volume in the panel summary without a deselect/reselect round trip", async () => {
    installHost();
    render(<GeneratorEditor {...baseProps} generator={patternGenerator()} />);

    dispatchSnapshot({
      generators: [patternGenerator({ volume: 8500 })],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });
    await waitFor(() => expect(screen.getByText(/8,500 arrivals/)).toBeInTheDocument());

    // A second snapshot, as if the modal wrote again.
    dispatchSnapshot({
      generators: [patternGenerator({ volume: 9000 })],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });
    await waitFor(() => expect(screen.getByText(/9,000 arrivals/)).toBeInTheDocument());
  });

  it("does not clobber an in-progress panel edit when an unrelated snapshot arrives", async () => {
    installHost();
    render(<GeneratorEditor {...baseProps} generator={patternGenerator()} />);

    dispatchSnapshot({
      generators: [patternGenerator()],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });
    await waitFor(() => expect(screen.getByText(/8,500 arrivals/)).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText(/enter generator name/i);
    fireEvent.change(nameInput, { target: { name: "name", value: "Half-typed" } });

    // A snapshot that carries NO change to the modal-owned fields (the
    // common case: any unrelated host push). The user's half-typed name must
    // survive it -- useFormSync skips its refill while hasPendingChanges is
    // true, and the MODAL-AUTHORED FIELDS effect only adopts a value that
    // actually changed.
    dispatchSnapshot({
      generators: [patternGenerator()],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });

    expect((screen.getByPlaceholderText(/enter generator name/i) as HTMLInputElement).value)
      .toBe("Half-typed");
  });
});
