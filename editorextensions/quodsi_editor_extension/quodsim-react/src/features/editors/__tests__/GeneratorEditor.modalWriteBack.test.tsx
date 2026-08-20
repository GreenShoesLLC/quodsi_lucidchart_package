import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType } from "@quodsi/lucid-shared";

/**
 * The panel writing back over the modal's edit.
 *
 * THE FAILURE THIS PINS. The arrival-pattern modal owns `volume`; the panel
 * owns everything else, and its autosave writes the WHOLE Generator every
 * time (updateGeneratorImmutably carries volume/arrivalPatternId forward).
 * useFormSync only re-syncs the draft when the SELECTED ELEMENT changes, so
 * fresh props for the element already open were ignored -- and the next panel
 * edit (a rename, say) saved the pre-modal volume straight back over the
 * modal's write. Silent data loss.
 *
 * WHY A PROP RERENDER IS THE RIGHT STAND-IN FOR "the modal wrote".
 * The modal's volume write is a shape write (ELEMENT_UPDATE). The host's
 * ElementOpsHandler answers it by re-running SelectionHandler, which sends a
 * fresh SELECTION_CHANGED -- new props for this component with the same
 * element id. It does NOT push a MODEL_ROOT_SNAPSHOT. So "same id, changed
 * volume in props" is exactly what the panel sees after a modal edit.
 *
 * These tests deliberately do NOT mock ../hooks/useEditorState: the whole
 * point is the interaction between the real useFormSync and the real
 * useAutoSave. (Most sibling GeneratorEditor suites stub that module out,
 * which is why none of them could have caught this.)
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
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

const onSave = vi.fn();

const baseProps = {
  onSave,
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
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

/** Simulates the host pushing a MODEL_ROOT_SNAPSHOT, as
 *  GeneratorEditor.pattern.test.tsx does. */
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

beforeEach(() => {
  onSave.mockClear();
});

describe("GeneratorEditor — the panel must not write back over the modal's edit", () => {
  it("saves the volume the MODAL wrote, not the one the panel was mounted with, when the user then renames the generator", async () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator()} />
    );

    // The modal wrote volume 9000 and closed: the host re-ran the selection,
    // so the panel gets fresh props for the SAME generator.
    rerender(
      <GeneratorEditor {...baseProps} generator={patternGenerator({ volume: 9000 })} />
    );

    // Now the user edits a field the PANEL owns.
    const nameInput = screen.getByPlaceholderText(/enter generator name/i);
    fireEvent.change(nameInput, { target: { name: "name", value: "Arrivals v2" } });

    // Autosave (500ms debounce) writes the whole Generator.
    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 2000 });

    const saved = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(saved.name).toBe("Arrivals v2");
    // Before the fix this was 8500 -- the modal's edit, reverted.
    expect(saved.volume).toBe(9000);
    expect(saved.arrivalPatternId).toBe("ap-1");
  });

  it("shows the modal's volume in the panel summary without a deselect/reselect round trip", async () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator()} />
    );

    // The summary needs a projection for the pattern's SHAPE; its VOLUME half
    // comes from the draft, which is the half that used to go stale (spec §9
    // promised both halves would already reflect the modal's edits).
    dispatchSnapshot({
      generators: [{ id: "g1", name: "Arrivals", volume: 8500, arrivalPatternId: "ap-1" }],
      arrivalPatterns: [{ id: "ap-1", name: "Arrivals pattern" }],
      model: {},
    });

    await waitFor(() => expect(screen.getByText(/8,500 arrivals/)).toBeInTheDocument());

    rerender(
      <GeneratorEditor {...baseProps} generator={patternGenerator({ volume: 9000 })} />
    );

    await waitFor(() => expect(screen.getByText(/9,000 arrivals/)).toBeInTheDocument());
  });

  it("does not clobber an in-progress panel edit when props for the same element arrive unchanged", async () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator()} />
    );

    const nameInput = screen.getByPlaceholderText(/enter generator name/i);
    fireEvent.change(nameInput, { target: { name: "name", value: "Half-typed" } });

    // A prop refresh that carries NO change to the modal-owned fields (the
    // common case: any unrelated host push). The user's half-typed name must
    // survive it -- this is the trap a naive "re-sync on every projection"
    // would fall into.
    rerender(
      <GeneratorEditor {...baseProps} generator={patternGenerator()} />
    );

    expect((screen.getByPlaceholderText(/enter generator name/i) as HTMLInputElement).value)
      .toBe("Half-typed");

    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 2000 });
    const saved = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(saved.name).toBe("Half-typed");
    expect(saved.volume).toBe(8500);
  });
});
