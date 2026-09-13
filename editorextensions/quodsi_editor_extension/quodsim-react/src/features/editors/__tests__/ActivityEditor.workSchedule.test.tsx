// quodsim-react/src/features/editors/__tests__/ActivityEditor.workSchedule.test.tsx
//
// Task D3 — Lucid's Activity editor gains the "Fixed capacity | Follow a
// schedule" control (spec 2026-08-27 §6, case E6).
//
// Until D3 the Basic tab rendered a bare "Activity Capacity" number input and
// never mounted anything that could link an activity to a work schedule, so
// there was NO route to case E6 in Lucid at all -- D2 built the storage,
// projection and clearable-key machinery underneath a producer that did not
// exist yet. This file pins that producer.
//
// FOUR THINGS ARE LOAD-BEARING HERE, and each has a test below:
//
//  1. LINK writes into the DRAFT, not directly through accessor.updateShape.
//     This editor is draft + autosave; a shape write behind its back would be
//     clobbered by the next autosave of a draft that never learned about it.
//     The seeded nominal capacity (CapacitySourcePicker's own header: a
//     nominal of 1 against a schedule staffing 3 reports 300% utilization)
//     rides on the SAME draft update.
//
//  2. CLEAR must SAY it was cleared. Since Task 4 (spec 2026-09-13
//     lucid-shape-writes §3) the editor saves through the model-root
//     source's batched shape queue: a `workScheduleId: undefined` key in the
//     patch handed to accessor.updateShape travels on MODEL_ROOT_UPDATE as
//     `data.shapes[n].clearedFields`, not a value the extension would have
//     to distinguish from "never mentioned".
//
//  3. NEW SCHEDULE is a MODEL-ROOT write (`updateModel({ workSchedules })`
//     -> MODEL_ROOT_UPDATE), never a shape write: a work schedule is a
//     model-level record.
//
//  4. EDIT SCHEDULE goes out as OPEN_WORK_SCHEDULE_MODAL (D2's channel), so
//     the schedule editor is a real Lucid modal rather than a dialog trapped
//     inside the 300px right-dock panel. That is the `onEdit` seam added to
//     CapacitySourcePicker in the monorepo half of this task.
//
// Harness: the model-root projection arrives by dispatching a real
// MODEL_ROOT_SNAPSHOT message, and outgoing envelopes are observed through a
// fake host installed over window.parent.postMessage, so the real
// useModelRootSource plumbing runs (mirrors GeneratorEditor.pattern.test.tsx's
// fake host, migrated for the same spec). Like
// ActivityEditor.queueRanking.test.tsx this file does NOT stub
// "../hooks/useEditorState": the real useAutoSave is what drives the writes
// these assertions read off the wire.
//
// FAKE TIMERS, for the same reason as ActivityEditor.shapeWrites.test.tsx: a
// draft that ends a test unsaved (e.g. the sync "New schedule" test below)
// still queues its unmount save into the model-root source's 0.4 s pause.
// On REAL timers that timer fires ~400ms later, on the NEXT test, and posts
// through THAT test's own postMessage spy -- an order-dependent flake this
// file hit under `--sequence.shuffle` (seed 1789341715203 reproduces it: the
// "declares nothing about workScheduleId" test received the previous test's
// leaked new-schedule UUID). `afterEach` unmounts every rendered tree
// (dropping each source's window listener and flush-registry entry), resets
// the registry, and drops every timer still scheduled before switching back
// to real timers -- mirrored from shapeWrites.test.tsx.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import ActivityEditor, {
  extractActivityData,
  updateActivityImmutably,
} from "../ActivityEditor";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";
import { resetModelRootWritesForTests } from "../../../adapters/modelRootWrites";
import { setView } from "quodsi_studio/platforms/shared";

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  states: {} as any,
  referenceData: {} as any,
};

/** Staffs 3 -- above the unlinked activity's capacity of 1, so the
 *  nominal-seeding branch is exercised rather than being inert. */
const NT = {
  id: "ws-nt",
  name: "Nursing Team",
  offShiftCapacity: 0,
  pattern: [
    { days: ["mon", "tue", "wed", "thu", "fri"], start: "07:00", end: "15:00", capacity: 3 },
  ],
  exceptions: [],
};

const unlinked = {
  id: "act-1",
  name: "Triage",
  capacity: 1,
  inboundCapacity: 999999,
  outboundCapacity: 999999,
  actions: [],
} as any;

const linked = { ...unlinked, capacity: 3, workScheduleId: "ws-nt" } as any;

// The stored record for whichever activity is under test -- Task 4 refills
// the draft from this row on every accepted snapshot (spec 2026-09-13
// lucid-shape-writes §3), so it must reflect the SAME fields the rendered
// `activity` prop carries. A sparse row that omits a field the real activity
// actually has (e.g. a "linked" fixture whose snapshot row forgets
// workScheduleId) would clobber the draft the instant the snapshot lands --
// exactly what a real host's full-record snapshot (Task 1) never does.
const UNLINKED_ROW = { id: "act-1", name: "Triage", capacity: 1, actions: [] };
const LINKED_ROW = { id: "act-1", name: "Triage", capacity: 3, workScheduleId: "ws-nt", actions: [] };

function projectionWith(workSchedules: any[], activities: any[] = [UNLINKED_ROW]) {
  return {
    generators: [],
    arrivalPatterns: [],
    arrivalSchedules: [],
    entities: [],
    states: [],
    resources: [],
    resourceRequirements: [],
    activities,
    workSchedules,
    model: {},
  };
}

/** The host pushing MODEL_ROOT_SNAPSHOT, in reply to the request
 *  useModelRootSource fires on mount. */
function dispatchSnapshot(projection: Record<string, unknown>, id = "snapshot-push") {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id,
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
 * A minimal fake host: tracks workSchedules + the Activity's own record and
 * answers MODEL_ROOT_UPDATE the way the real extension does
 * (modelRootHandler.ts) -- applying the model patch and any Activity shape
 * edits (spec 2026-09-13 lucid-shape-writes §2) before replying with success
 * and pushing a snapshot tagged with the write's own envelope id. Register
 * before render() so the initial MODEL_ROOT_REQUEST on mount is captured too
 * (harmless: this fake only reacts to MODEL_ROOT_UPDATE).
 */
function installHost(initialActivity: Record<string, unknown> = UNLINKED_ROW) {
  const posted: any[] = [];
  let workSchedules: any[] = [];
  let activityRow: Record<string, unknown> = { ...initialActivity };

  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    posted.push(envelope);
    if (envelope?.type !== EnvelopeMessageType.MODEL_ROOT_UPDATE) return;

    const patch = envelope.data?.patch ?? {};
    if (patch.workSchedules) workSchedules = patch.workSchedules;
    for (const shape of envelope.data?.shapes ?? []) {
      if (shape.type !== "Activity" || shape.shapeId !== activityRow.id) continue;
      const merged: Record<string, unknown> = { ...activityRow, ...shape.patch };
      for (const key of shape.clearedFields ?? []) delete merged[key];
      activityRow = merged;
    }

    window.dispatchEvent(new MessageEvent("message", {
      data: {
        id: envelope.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        data: { success: true },
      },
    }));
    dispatchSnapshot(projectionWith(workSchedules, [activityRow]), envelope.id);
  });

  return posted;
}

function modelRootUpdates(posted: any[]) {
  return posted.filter((e) => e?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE);
}

function activityShapeWrites(posted: any[]) {
  return modelRootUpdates(posted).flatMap((e) => e.data?.shapes ?? []).filter((s: any) => s.shapeId === "act-1");
}

/**
 * The last shape write this Activity sent. On fake timers a write's own
 * round trip settles on microtasks alone (the host's mock replies inline),
 * but a write reached only through the 0.5 s autosave / 0.4 s model-root
 * pause (e.g. a plain blur, not a decisive-control saveAndFlush) needs that
 * time advanced before it lands -- advancing past both covers either path.
 */
async function lastActivityShapeWrite(posted: any[]) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
  });
  expect(activityShapeWrites(posted).length).toBeGreaterThan(0);
  const writes = activityShapeWrites(posted);
  return writes[writes.length - 1];
}

// This file predates Complexity Views and exercises CapacitySourcePicker's
// "Follow a schedule" option, gated on resource.capacity.schedule --
// 'advanced' in the catalog. Pin the view for every test here rather than
// weaken any assertion -- view-gating itself is covered by viewGating.test.tsx
// / Studio's own viewFieldGating.test.tsx.
beforeEach(() => {
  vi.useFakeTimers();
  mockSendMessage.mockClear();
  setView("advanced");
});

afterEach(() => {
  cleanup();
  resetModelRootWritesForTests();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setView("basic");
});

describe("ActivityEditor — capacity source picker", () => {
  it("renders the two capacity sources in place of the bare capacity input", () => {
    installHost();
    render(<ActivityEditor activity={unlinked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    expect(screen.getByLabelText("Fixed capacity")).toBeChecked();
    expect(screen.getByLabelText("Follow a schedule")).not.toBeChecked();
    expect(screen.getByTestId("capacity-input")).toHaveValue(1);
  });

  it("links the schedule into the DRAFT and seeds the nominal capacity", async () => {
    const posted = installHost();
    render(<ActivityEditor activity={unlinked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    fireEvent.click(screen.getByLabelText("Follow a schedule"));

    const shapeWrite = await lastActivityShapeWrite(posted);
    expect(shapeWrite.patch.workScheduleId).toBe("ws-nt");
    // NT staffs 3, the activity stored 1 -- the raise rides on the same patch.
    expect(shapeWrite.patch.capacity).toBe(3);
    expect(screen.getByTestId("work-schedule-select")).toHaveValue("ws-nt");
  });

  it("declares workScheduleId cleared when the author switches back to Fixed", async () => {
    const posted = installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    fireEvent.click(screen.getByLabelText("Fixed capacity"));

    const shapeWrite = await lastActivityShapeWrite(posted);
    expect(shapeWrite.clearedFields).toContain("workScheduleId");
    // The declaration is the only thing that survives as EVIDENCE: the link
    // itself reaches the wire as an undefined-valued key, folded into
    // clearedFields rather than `patch` -- see toWireShapes in
    // useModelRootSource.ts.
    expect(shapeWrite.patch.workScheduleId).toBeUndefined();
  });

  it("declares nothing about workScheduleId while a schedule is linked", async () => {
    const posted = installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    // An unrelated edit, flushed the way the queueRanking test flushes one.
    const nameInput = screen.getByDisplayValue("Triage");
    fireEvent.change(nameInput, { target: { value: "Triage 2" } });
    fireEvent.blur(nameInput);

    const shapeWrite = await lastActivityShapeWrite(posted);
    expect(shapeWrite.patch.workScheduleId).toBe("ws-nt");
    expect(shapeWrite.clearedFields).not.toContain("workScheduleId");
  });

  it("'New schedule' creates through the MODEL-ROOT route and links the new id", async () => {
    const posted = installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    fireEvent.click(screen.getByRole("button", { name: "New schedule" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });
    expect(modelRootUpdates(posted).some((e) => e.data?.patch?.workSchedules)).toBe(true);
    const withModelPatch = modelRootUpdates(posted).find((e) => e.data?.patch?.workSchedules);
    const patch = withModelPatch.data.patch;
    // Appended to the model-level list, never replacing it, and never nested
    // under a `model` key.
    expect(Object.keys(patch)).toEqual(["workSchedules"]);
    expect(patch.workSchedules).toHaveLength(2);
    const newId = patch.workSchedules[1].id;
    expect(newId).not.toBe("ws-nt");
    // No ELEMENT_UPDATE: the shape link travels as `shapes` on the batched write.
    expect(posted.filter((e) => e?.type === EnvelopeMessageType.ELEMENT_UPDATE)).toHaveLength(0);

    const shapeWrite = await lastActivityShapeWrite(posted);
    expect(shapeWrite.patch.workScheduleId).toBe(newId);
  });

  it("'New schedule' opens the new schedule in the host modal, not an in-panel one", () => {
    installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    fireEvent.click(screen.getByRole("button", { name: "New schedule" }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      expect.objectContaining({ scheduleId: expect.any(String) })
    );
    expect(screen.queryByRole("dialog", { name: "Work Schedule" })).not.toBeInTheDocument();
  });

  it("'Edit schedule' opens the linked schedule over OPEN_WORK_SCHEDULE_MODAL", () => {
    installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    fireEvent.click(screen.getByRole("button", { name: "Edit schedule" }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      { scheduleId: "ws-nt" }
    );
    expect(screen.queryByRole("dialog", { name: "Work Schedule" })).not.toBeInTheDocument();
  });
});

// The draft helpers are the other half of the link surviving: an activity
// whose stored workScheduleId is dropped on extract, or resurrected on
// clear, would defeat everything above. Same two traps queueRanking hit
// (ClickUp 86e2qwv7y).
describe("ActivityEditor draft helpers — workScheduleId", () => {
  it("preserves a stored link through extractActivityData", () => {
    expect(extractActivityData(linked).workScheduleId).toBe("ws-nt");
  });

  it("carries the link forward through an unrelated edit", () => {
    const renamed = updateActivityImmutably(extractActivityData(linked), {
      name: "Renamed",
    });
    expect(renamed.workScheduleId).toBe("ws-nt");
  });

  it("keeps the link cleared once cleared (key-presence, not ??)", () => {
    const draft = updateActivityImmutably(extractActivityData(linked), {
      workScheduleId: undefined,
    } as any);
    expect(draft.workScheduleId).toBeUndefined();
    // `updates.workScheduleId ?? base.workScheduleId` would resurrect it here.
    const afterUnrelatedEdit = updateActivityImmutably(draft, { name: "Renamed" });
    expect(afterUnrelatedEdit.workScheduleId).toBeUndefined();
  });
});

// Final-review fix, 2026-09-01: the tab-bar ViewTell above (mounted at
// ActivityEditor.tsx's tab strip) only ever listed TAB_CONFIG's own tab
// surfaces, so a Basic-view Activity linked to a work schedule showed
// "Follow a schedule" checked-and-disabled (this file's first test, under
// 'advanced') with nothing explaining why in Basic -- the mirror of the
// Studio-side gap ACTIVITY_EXTRA_SURFACES fixed. Widening the tell's surface
// list with LUCID_ACTIVITY_EXTRA_SURFACES is what this proves.
describe("ActivityEditor Basic — capacity-schedule tell", () => {
  it("names the capacity-schedule concept when a Basic activity follows a work schedule", () => {
    setView("basic");
    installHost(LINKED_ROW);
    render(<ActivityEditor activity={linked} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT], [LINKED_ROW]));

    const tell = screen.getByRole("note");
    expect(tell).toHaveTextContent(/capacity schedule/i);
  });
});
