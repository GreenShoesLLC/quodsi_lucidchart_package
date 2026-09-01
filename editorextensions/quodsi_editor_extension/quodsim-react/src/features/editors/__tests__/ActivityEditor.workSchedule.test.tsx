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
//  1. LINK writes into the DRAFT, not through accessor.updateShape. This
//     editor is draft + autosave; a shape write behind its back would be
//     clobbered by the next autosave of a draft that never learned about it.
//     The seeded nominal capacity (CapacitySourcePicker's own header: a
//     nominal of 1 against a schedule staffing 3 reports 300% utilization)
//     rides on the SAME draft update.
//
//  2. CLEAR must SAY it was cleared. `workScheduleId: undefined` reaches the
//     extension as a key with no value, and StorageAdapter.updateElementData
//     strips undefined-valued keys before merging (so a partial update cannot
//     clobber stored width/height) -- so a clear that only nulls the field is
//     indistinguishable from a payload that never mentioned it, and the stored
//     link survives. The payload therefore names the field in
//     CLEARED_FIELDS_KEY, exactly as queueRanking already does
//     (ActivityEditor.queueRanking.test.tsx). See overTheWire() below for what
//     the transport really does to this payload, and what would break it.
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
// Harness: mirrors GeneratorEditor.pattern/schedule.test.tsx -- the model-root
// projection arrives by dispatching a real MODEL_ROOT_SNAPSHOT message, and
// outgoing envelopes are observed by spying on window.parent.postMessage
// rather than by module-mocking useModelRootSource, so the hook's own
// plumbing runs for real. Like ActivityEditor.queueRanking.test.tsx this file
// does NOT stub "../hooks/useEditorState": the real useAutoSave is what
// invokes the onSave prop these assertions read.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import ActivityEditor, {
  extractActivityData,
  updateActivityImmutably,
} from "../ActivityEditor";
import { CLEARED_FIELDS_KEY, EnvelopeMessageType } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
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
  onStatesChange: vi.fn(),
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

function projectionWith(workSchedules: any[]) {
  return {
    generators: [],
    arrivalPatterns: [],
    arrivalSchedules: [],
    entities: [],
    states: [],
    resources: [],
    resourceRequirements: [],
    activities: [{ id: "act-1", name: "Triage" }],
    workSchedules,
    model: {},
  };
}

/** The host pushing MODEL_ROOT_SNAPSHOT, in reply to the request
 *  useModelRootSource fires on mount. */
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
 * What this panel actually puts on the wire, modelled faithfully: the
 * ELEMENT_UPDATE sender spreads the draft into a plain object
 * (`{ ...data, id: elementId }` -- modelOpsSender.ts) and postMessage
 * structured-clones it. The spread is what carries the declaration across; the
 * class prototype does NOT survive it.
 *
 * Deliberately NOT JSON.stringify: `Activity.toJSON()` is a sparse whitelist
 * with no slot for CLEARED_FIELDS_KEY, so a JSON-serializing transport would
 * silently strip the declaration and every clear in this editor -- queueRanking
 * included -- would stop persisting. If the sender is ever changed to
 * JSON-encode its payload, this helper is where that regression should be
 * caught.
 *
 * `workScheduleId: undefined` DOES survive a structured clone as a key with an
 * undefined value -- which is exactly why the declaration is still required:
 * StorageAdapter.updateElementData strips undefined-valued keys before merging
 * (so a partial update cannot clobber stored width/height), leaving the stored
 * link untouched. The storage end of that is pinned by
 * tests/model/activityLucid.workScheduleIdClear.test.ts.
 */
function overTheWire(draft: any): any {
  return structuredClone({ ...draft, id: draft.id });
}

async function lastSave(onSave: ReturnType<typeof vi.fn>) {
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  return onSave.mock.calls.at(-1)![0];
}

// This file predates Complexity Views and exercises CapacitySourcePicker's
// "Follow a schedule" option, gated on resource.capacity.schedule --
// 'advanced' in the catalog. Pin the view for every test here rather than
// weaken any assertion -- view-gating itself is covered by viewGating.test.tsx
// / Studio's own viewFieldGating.test.tsx.
beforeEach(() => {
  mockSendMessage.mockClear();
  setView("advanced");
});

afterEach(() => {
  vi.restoreAllMocks();
  setView("basic");
});

describe("ActivityEditor — capacity source picker", () => {
  it("renders the two capacity sources in place of the bare capacity input", () => {
    render(<ActivityEditor activity={unlinked} onSave={vi.fn()} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    expect(screen.getByLabelText("Fixed capacity")).toBeChecked();
    expect(screen.getByLabelText("Follow a schedule")).not.toBeChecked();
    expect(screen.getByTestId("capacity-input")).toHaveValue(1);
  });

  it("links the schedule into the DRAFT and seeds the nominal capacity", async () => {
    const onSave = vi.fn();
    render(<ActivityEditor activity={unlinked} onSave={onSave} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    fireEvent.click(screen.getByLabelText("Follow a schedule"));

    const saved = await lastSave(onSave);
    expect(saved.workScheduleId).toBe("ws-nt");
    // NT staffs 3, the activity stored 1 -- the raise rides on the same patch.
    expect(saved.capacity).toBe(3);
    expect(screen.getByTestId("work-schedule-select")).toHaveValue("ws-nt");
  });

  it("declares workScheduleId cleared when the author switches back to Fixed", async () => {
    const onSave = vi.fn();
    render(<ActivityEditor activity={linked} onSave={onSave} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    fireEvent.click(screen.getByLabelText("Fixed capacity"));

    const saved = await lastSave(onSave);
    expect(saved[CLEARED_FIELDS_KEY]).toContain("workScheduleId");
    // The declaration is the only thing that survives as EVIDENCE: the link
    // itself reaches the extension as an undefined-valued key, which
    // StorageAdapter strips before merging, so without the declaration the
    // stored link would simply stay put.
    const wire = overTheWire(saved);
    expect(wire.workScheduleId).toBeUndefined();
    expect(wire[CLEARED_FIELDS_KEY]).toContain("workScheduleId");
  });

  it("declares nothing about workScheduleId while a schedule is linked", async () => {
    const onSave = vi.fn();
    render(<ActivityEditor activity={linked} onSave={onSave} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    // An unrelated edit, flushed the way the queueRanking test flushes one.
    const nameInput = screen.getByDisplayValue("Triage");
    fireEvent.change(nameInput, { target: { value: "Triage 2" } });
    fireEvent.blur(nameInput);

    const saved = await lastSave(onSave);
    expect(saved.workScheduleId).toBe("ws-nt");
    expect(saved[CLEARED_FIELDS_KEY] ?? []).not.toContain("workScheduleId");
  });

  it("'New schedule' creates through the MODEL-ROOT route and links the new id", async () => {
    const onSave = vi.fn();
    const postMessageSpy = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation(() => {});
    render(<ActivityEditor activity={linked} onSave={onSave} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    fireEvent.click(screen.getByRole("button", { name: "New schedule" }));

    const sent = () => postMessageSpy.mock.calls.map(([envelope]: any[]) => envelope);
    const modelRootUpdates = sent().filter(
      (e: any) => e?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE
    );
    expect(modelRootUpdates).toHaveLength(1);
    const patch = modelRootUpdates[0].data.patch;
    // Appended to the model-level list, never replacing it, and never nested
    // under a `model` key.
    expect(Object.keys(patch)).toEqual(["workSchedules"]);
    expect(patch.workSchedules).toHaveLength(2);
    const newId = patch.workSchedules[1].id;
    expect(newId).not.toBe("ws-nt");
    // No ELEMENT_UPDATE: the link lives in the draft until autosave.
    expect(
      sent().filter((e: any) => e?.type === EnvelopeMessageType.ELEMENT_UPDATE)
    ).toHaveLength(0);

    const saved = await lastSave(onSave);
    expect(saved.workScheduleId).toBe(newId);
  });

  it("'New schedule' opens the new schedule in the host modal, not an in-panel one", () => {
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    render(<ActivityEditor activity={linked} onSave={vi.fn()} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

    fireEvent.click(screen.getByRole("button", { name: "New schedule" }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      expect.objectContaining({ scheduleId: expect.any(String) })
    );
    expect(screen.queryByRole("dialog", { name: "Work Schedule" })).not.toBeInTheDocument();
  });

  it("'Edit schedule' opens the linked schedule over OPEN_WORK_SCHEDULE_MODAL", () => {
    render(<ActivityEditor activity={linked} onSave={vi.fn()} {...baseProps} />);
    dispatchSnapshot(projectionWith([NT]));

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
