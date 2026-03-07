import { ScenarioPropertyName, ScenarioSetterType } from "../../src/types/elements";
import {
  validateChangeRequestValue,
  isIntegerInput,
} from "../../src/validation/rules/ScenarioChangeValidation";

describe("validateChangeRequestValue", () => {
  // =========================================================================
  // CAPACITY (min = 1)
  // =========================================================================
  describe("CAPACITY", () => {
    const prop = ScenarioPropertyName.CAPACITY;

    it("EQUAL: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0);
      expect(r.valid).toBe(false);
      expect(r.error).toBeDefined();
    });

    it("EQUAL: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, -1);
      expect(r.valid).toBe(false);
    });

    it("EQUAL: accepts 1", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 1);
      expect(r.valid).toBe(true);
      expect(r.error).toBeUndefined();
    });

    it("EQUAL: accepts 5", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 5);
      expect(r.valid).toBe(true);
    });

    it("EQUAL: rejects float", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 1.5);
      expect(r.valid).toBe(false);
      expect(r.error).toContain("whole number");
    });

    it("ADD: warns on 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.ADD, 0);
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it("ADD: accepts negative (user decision)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.ADD, -3);
      expect(r.valid).toBe(true);
    });

    it("SUBTRACT: warns on 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.SUBTRACT, 0);
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it("MULTIPLY: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0);
      expect(r.valid).toBe(false);
    });

    it("MULTIPLY: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, -2);
      expect(r.valid).toBe(false);
    });

    it("MULTIPLY: warns on 1", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 1);
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it("MULTIPLY: accepts 2.5 (float ok for multiplier)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 2.5);
      expect(r.valid).toBe(true);
    });

    it("DIVIDE: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, 0);
      expect(r.valid).toBe(false);
    });

    it("DIVIDE: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, -1);
      expect(r.valid).toBe(false);
    });

    it("DIVIDE: warns on 1", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, 1);
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it("MINIMUM: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, 0);
      expect(r.valid).toBe(false);
    });

    it("MINIMUM: accepts 1", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, 1);
      expect(r.valid).toBe(true);
    });

    it("MAXIMUM: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MAXIMUM, 0);
      expect(r.valid).toBe(false);
    });

    it("MAXIMUM: accepts 3", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MAXIMUM, 3);
      expect(r.valid).toBe(true);
    });
  });

  // =========================================================================
  // INBOUND_QUEUE_CAPACITY (min = 0)
  // =========================================================================
  describe("INBOUND_QUEUE_CAPACITY", () => {
    const prop = ScenarioPropertyName.INBOUND_QUEUE_CAPACITY;

    it("EQUAL: accepts 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0);
      expect(r.valid).toBe(true);
    });

    it("EQUAL: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, -1);
      expect(r.valid).toBe(false);
    });

    it("MINIMUM: accepts 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, 0);
      expect(r.valid).toBe(true);
    });

    it("MINIMUM: rejects -1", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, -1);
      expect(r.valid).toBe(false);
    });

    it("MULTIPLY: rejects 0 (not WEIGHT)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0);
      expect(r.valid).toBe(false);
    });
  });

  // =========================================================================
  // WEIGHT (min = 0, multiply by 0 allowed)
  // =========================================================================
  describe("WEIGHT", () => {
    const prop = ScenarioPropertyName.WEIGHT;

    it("EQUAL: accepts 0 (disables connector)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0);
      expect(r.valid).toBe(true);
    });

    it("EQUAL: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, -0.5);
      expect(r.valid).toBe(false);
    });

    it("EQUAL: accepts float", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0.75);
      expect(r.valid).toBe(true);
    });

    it("MULTIPLY: accepts 0 (disables connector)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0);
      expect(r.valid).toBe(true);
    });

    it("MULTIPLY: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, -1);
      expect(r.valid).toBe(false);
    });

    it("DIVIDE: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, 0);
      expect(r.valid).toBe(false);
    });

    it("DIVIDE: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, -2);
      expect(r.valid).toBe(false);
    });
  });

  // =========================================================================
  // RUN_PERIOD (min > 0, float)
  // =========================================================================
  describe("RUN_PERIOD", () => {
    const prop = ScenarioPropertyName.RUN_PERIOD;

    it("EQUAL: rejects 0 (exclusive)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0);
      expect(r.valid).toBe(false);
    });

    it("EQUAL: accepts 0.001", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0.001);
      expect(r.valid).toBe(true);
    });

    it("EQUAL: rejects negative", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, -10);
      expect(r.valid).toBe(false);
    });

    it("MULTIPLY: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0);
      expect(r.valid).toBe(false);
    });

    it("MINIMUM: rejects 0 (exclusive)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, 0);
      expect(r.valid).toBe(false);
    });
  });

  // =========================================================================
  // SEED (no min/max constraints)
  // =========================================================================
  describe("SEED", () => {
    const prop = ScenarioPropertyName.SEED;

    it("EQUAL: accepts any integer", () => {
      expect(validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0).valid).toBe(true);
      expect(validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, -42).valid).toBe(true);
      expect(validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 999).valid).toBe(true);
    });

    it("EQUAL: rejects float", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 1.5);
      expect(r.valid).toBe(false);
      expect(r.error).toContain("whole number");
    });

    it("ADD: warns on 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.ADD, 0);
      expect(r.valid).toBe(true);
      expect(r.warning).toBeDefined();
    });

    it("MULTIPLY: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0);
      expect(r.valid).toBe(false);
    });

    it("MULTIPLY: accepts negative (any nonzero for SEED)", () => {
      // SEED has no min constraint, so multiply by negative is allowed
      // (propConstraint is null, falls into null branch)
      const r = validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, -1);
      expect(r.valid).toBe(true);
    });

    it("DIVIDE: rejects 0", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, 0);
      expect(r.valid).toBe(false);
    });

    it("DIVIDE: accepts negative (any nonzero for SEED)", () => {
      const r = validateChangeRequestValue(prop, ScenarioSetterType.DIVIDE, -2);
      expect(r.valid).toBe(true);
    });

    it("MINIMUM/MAXIMUM: accepts any integer", () => {
      expect(validateChangeRequestValue(prop, ScenarioSetterType.MINIMUM, -100).valid).toBe(true);
      expect(validateChangeRequestValue(prop, ScenarioSetterType.MAXIMUM, 0).valid).toBe(true);
    });
  });

  // =========================================================================
  // REPS (min = 1, same as capacity)
  // =========================================================================
  describe("REPS", () => {
    const prop = ScenarioPropertyName.REPS;

    it("EQUAL: rejects 0", () => {
      expect(validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 0).valid).toBe(false);
    });

    it("EQUAL: accepts 1", () => {
      expect(validateChangeRequestValue(prop, ScenarioSetterType.EQUAL, 1).valid).toBe(true);
    });

    it("MULTIPLY: rejects 0", () => {
      expect(validateChangeRequestValue(prop, ScenarioSetterType.MULTIPLY, 0).valid).toBe(false);
    });
  });

  // =========================================================================
  // No-op warnings
  // =========================================================================
  describe("no-op warnings", () => {
    it("MULTIPLY by 1 warns", () => {
      const r = validateChangeRequestValue(
        ScenarioPropertyName.CAPACITY,
        ScenarioSetterType.MULTIPLY,
        1
      );
      expect(r.valid).toBe(true);
      expect(r.warning).toContain("no effect");
    });

    it("DIVIDE by 1 warns", () => {
      const r = validateChangeRequestValue(
        ScenarioPropertyName.CAPACITY,
        ScenarioSetterType.DIVIDE,
        1
      );
      expect(r.valid).toBe(true);
      expect(r.warning).toContain("no effect");
    });

    it("ADD 0 warns", () => {
      const r = validateChangeRequestValue(
        ScenarioPropertyName.WEIGHT,
        ScenarioSetterType.ADD,
        0
      );
      expect(r.valid).toBe(true);
      expect(r.warning).toContain("no effect");
    });

    it("SUBTRACT 0 warns", () => {
      const r = validateChangeRequestValue(
        ScenarioPropertyName.WEIGHT,
        ScenarioSetterType.SUBTRACT,
        0
      );
      expect(r.valid).toBe(true);
      expect(r.warning).toContain("no effect");
    });
  });
});

describe("isIntegerInput", () => {
  it("returns true for CAPACITY + EQUAL", () => {
    expect(isIntegerInput(ScenarioPropertyName.CAPACITY, ScenarioSetterType.EQUAL)).toBe(true);
  });

  it("returns false for CAPACITY + MULTIPLY (float multiplier allowed)", () => {
    expect(isIntegerInput(ScenarioPropertyName.CAPACITY, ScenarioSetterType.MULTIPLY)).toBe(false);
  });

  it("returns false for CAPACITY + DIVIDE (float divisor allowed)", () => {
    expect(isIntegerInput(ScenarioPropertyName.CAPACITY, ScenarioSetterType.DIVIDE)).toBe(false);
  });

  it("returns false for WEIGHT (float property)", () => {
    expect(isIntegerInput(ScenarioPropertyName.WEIGHT, ScenarioSetterType.EQUAL)).toBe(false);
  });

  it("returns false for RUN_PERIOD (float property)", () => {
    expect(isIntegerInput(ScenarioPropertyName.RUN_PERIOD, ScenarioSetterType.EQUAL)).toBe(false);
  });

  it("returns true for SEED + ADD", () => {
    expect(isIntegerInput(ScenarioPropertyName.SEED, ScenarioSetterType.ADD)).toBe(true);
  });

  it("returns true for REPS + MINIMUM", () => {
    expect(isIntegerInput(ScenarioPropertyName.REPS, ScenarioSetterType.MINIMUM)).toBe(true);
  });
});
