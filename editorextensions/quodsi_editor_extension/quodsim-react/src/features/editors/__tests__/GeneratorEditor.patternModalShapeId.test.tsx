// Final fix wave, items 1 & 2.
//
// Item 1: PatternModal's `shapeId` must be a snapshot of the selection taken
// when "Edit pattern" was clicked, not a live read of localGeneratorDraft.id
// -- the canvas sits outside this panel's iframe, so the modal does not
// block canvas clicks. Without freezing, selecting a different PATTERN
// generator while the modal is open would swap which generator's pattern is
// being edited underneath the user.
//
// Item 2: isPatternModalOpen must reset whenever the selected generator
// changes. Without this: select a PATTERN generator, open the modal, select
// a FREQUENCY generator (PatternModal unmounts -- it's only rendered when
// isPatternGenerator -- but isPatternModalOpen stays true), then select any
// PATTERN generator -- the modal pops open again with no user action.
//
// Both fixes are exercised together below (they always ship together), but
// the first test isolates item 1 specifically: it inspects EVERY render
// PatternModal received during a direct PATTERN -> PATTERN selection change,
// not just the final settled one -- item 2's reset effect closes the modal
// one render after the id changes, so the settled DOM looks identical
// whether or not item 1's freeze exists. The transient render in between
// (open still true, id already switched) is where an unfrozen shapeId would
// have shown the WRONG generator's pattern while still "open" -- exactly the
// bug item 1's header comment describes. Reverting item 1's fix alone (while
// keeping item 2) makes this specific test fail; see the final fix wave
// report for the falsification run.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

// Real useFormSync (NOT mocked, unlike the other GeneratorEditor test
// files): this suite is specifically about behavior when the SELECTED
// generator changes across a rerender, which is exactly what useFormSync
// drives (it syncs localGeneratorDraft to a new `generator` prop). The
// other three hooks are mocked away -- their own machinery isn't under test
// here and real useAutoSave would fire saveNow() debounced timers this
// suite doesn't need to manage.
vi.mock("../hooks/useEditorState", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useEditorState")>();
  return {
    ...actual,
    useSaveCompletionDetector: () => {},
    useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
    useFlushOnChange: () => {},
  };
});

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

// Stub PatternModal so this suite can inspect every prop set it was ever
// rendered with (via mockPatternModal.mock.calls), including transient
// renders that settle before RTL's rerender() call returns -- not just the
// final DOM.
const { mockPatternModal } = vi.hoisted(() => ({ mockPatternModal: vi.fn() }));
vi.mock("../PatternModal", () => ({
  PatternModal: (props: { open: boolean; shapeId: string }) => {
    mockPatternModal({ open: props.open, shapeId: props.shapeId });
    return props.open ? <div data-testid="pattern-modal-stub">{props.shapeId}</div> : null;
  },
}));

const baseProps = {
  onSave: vi.fn(),
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
};

function patternGenerator(id: string, patternId: string) {
  return {
    id,
    name: `Gen ${id}`,
    mode: GeneratorType.PATTERN,
    arrivalPatternId: patternId,
    volume: 100,
    levers: [],
  } as any;
}

function frequencyGenerator(id: string) {
  return { id, name: `Gen ${id}`, mode: GeneratorType.FREQUENCY, levers: [] } as any;
}

describe("GeneratorEditor PatternModal wiring (final fix wave items 1 & 2)", () => {
  beforeEach(() => {
    mockPatternModal.mockClear();
  });

  it("item 1: never shows the newly-selected generator's id to PatternModal while it is still open", () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator("g-a", "ap-a")} />
    );
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));
    mockPatternModal.mockClear(); // keep only what happens from the selection change on

    rerender(<GeneratorEditor {...baseProps} generator={patternGenerator("g-b", "ap-b")} />);

    const openCalls = mockPatternModal.mock.calls.filter(([p]) => p.open);
    // The modal must have been open for at least one render of this
    // transition (item 2 closes it, but not instantaneously within the
    // same render as the id change) -- otherwise this test would trivially
    // pass without proving anything.
    expect(openCalls.length).toBeGreaterThan(0);
    for (const [props] of openCalls) {
      expect(props.shapeId).toBe("g-a");
    }
  });

  it("item 2: closes the modal on a direct PATTERN -> PATTERN selection change", () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator("g-a", "ap-a")} />
    );
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));
    expect(screen.getByTestId("pattern-modal-stub")).toBeInTheDocument();

    rerender(<GeneratorEditor {...baseProps} generator={patternGenerator("g-b", "ap-b")} />);

    expect(screen.queryByTestId("pattern-modal-stub")).not.toBeInTheDocument();
  });

  it("item 2: does not reopen with no user action after PATTERN -> FREQUENCY -> PATTERN", () => {
    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={patternGenerator("g-a", "ap-a")} />
    );
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));
    expect(screen.getByTestId("pattern-modal-stub")).toBeInTheDocument();

    // Select a FREQUENCY generator -- PatternModal unmounts (isPatternGenerator
    // becomes false), but pre-fix isPatternModalOpen stayed true.
    rerender(<GeneratorEditor {...baseProps} generator={frequencyGenerator("g-freq")} />);
    expect(screen.queryByTestId("pattern-modal-stub")).not.toBeInTheDocument();

    // Select a (different) PATTERN generator -- must NOT reopen on its own.
    rerender(<GeneratorEditor {...baseProps} generator={patternGenerator("g-b", "ap-b")} />);
    expect(screen.queryByTestId("pattern-modal-stub")).not.toBeInTheDocument();
  });

  it("passes the id captured at click time to PatternModal, not the live draft id", () => {
    render(<GeneratorEditor {...baseProps} generator={patternGenerator("g-a", "ap-a")} />);
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));

    const lastCall = mockPatternModal.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({ open: true, shapeId: "g-a" });
  });
});
