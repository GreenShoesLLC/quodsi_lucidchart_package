import { describe, it, expect } from "vitest";
import { MODEL_FIELD_KEYS, ModelDefaults, PeriodUnit, SimulationTimeType } from "@quodsi/lucid-shared";
import { buildModelSettingsPatch, extractModelData, modelSettingsSyncKey } from "../modelEditorHelpers";

const SETTINGS_KEYS = MODEL_FIELD_KEYS.filter((key) => key !== "id").sort();

describe("buildModelSettingsPatch", () => {
  it("carries exactly the model fields minus id -- never id or scenarios", () => {
    const draft = extractModelData({ id: "m1", name: "Clinic", scenarios: ["s"] } as never);
    expect(Object.keys(buildModelSettingsPatch(draft)).sort()).toEqual(SETTINGS_KEYS);
  });

  it("applies the Basic tab's save defaults", () => {
    const draft = extractModelData({ id: "m1", name: "Clinic" } as never);
    Object.assign(draft, {
      replications: 0, seed: 0, timeUnit: undefined, timeMode: undefined,
      warmupTime: undefined, runTime: undefined, description: undefined, levers: undefined,
    });
    expect(buildModelSettingsPatch(draft)).toMatchObject({
      replications: 1,
      seed: ModelDefaults.DEFAULT_SEED,
      timeUnit: PeriodUnit.HOURS,
      timeMode: SimulationTimeType.Clock,
      warmupTime: { value: 0, unit: PeriodUnit.HOURS },
      runTime: { value: 24, unit: PeriodUnit.HOURS },
      description: "",
      levers: [],
    });
  });

  it("sends dates as ISO strings, and null when unset", () => {
    const draft = extractModelData({ id: "m1", name: "Clinic", startDateTime: "2026-06-01T08:00:00.000Z" } as never);
    const patch = buildModelSettingsPatch(draft);
    expect(patch.startDateTime).toBe("2026-06-01T08:00:00.000Z");
    expect(patch.warmupDateTime).toBeNull();
    expect(patch.finishDateTime).toBeNull();
  });
});

describe("modelSettingsSyncKey", () => {
  const base = {
    pageId: "page-1", id: "m1", name: "Clinic", replications: 3,
    runTime: { value: 8, unit: "hours" }, startDateTime: "2026-06-01T08:00:00.000Z",
    levers: [], arrivalPatterns: [],
  };

  it("is equal for equal values regardless of key order, or a Date vs its ISO string", () => {
    const reordered = {
      levers: [], runTime: { unit: "hours", value: 8 }, replications: 3, name: "Clinic", id: "m1",
      startDateTime: new Date("2026-06-01T08:00:00.000Z"),
    };
    expect(modelSettingsSyncKey(reordered)).toBe(modelSettingsSyncKey(base));
  });

  it("ignores keys that are not model fields", () => {
    const other = { ...base, pageId: "page-2", arrivalPatterns: [{ id: "ap" }], model: { name: "x" } };
    expect(modelSettingsSyncKey(other)).toBe(modelSettingsSyncKey(base));
  });

  it("treats an undefined field like a missing one", () => {
    expect(modelSettingsSyncKey({ ...base, description: undefined })).toBe(modelSettingsSyncKey(base));
  });

  it("changes when any model field changes", () => {
    expect(modelSettingsSyncKey({ ...base, name: "Clinic 2" })).not.toBe(modelSettingsSyncKey(base));
    expect(modelSettingsSyncKey({ ...base, runTime: { value: 9, unit: "hours" } })).not.toBe(modelSettingsSyncKey(base));
    expect(modelSettingsSyncKey({ ...base, levers: [{ leverId: "lv" }] })).not.toBe(modelSettingsSyncKey(base));
  });
});
