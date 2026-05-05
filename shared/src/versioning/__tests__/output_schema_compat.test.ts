import { isOutputSchemaCompatible } from "../output_schema_compat";
import { EXPECTED_OUTPUT_SCHEMA_VERSION } from "../../constants/version";

describe("isOutputSchemaCompatible", () => {
  test("returns false for null", () => {
    expect(isOutputSchemaCompatible(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isOutputSchemaCompatible(undefined)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isOutputSchemaCompatible("")).toBe(false);
  });

  test("returns true when major matches", () => {
    expect(isOutputSchemaCompatible(EXPECTED_OUTPUT_SCHEMA_VERSION)).toBe(true);
  });

  test("returns true when major matches and minor differs (forward-minor)", () => {
    // EXPECTED is "1.0"; "1.5" should still be compatible
    expect(isOutputSchemaCompatible("1.5")).toBe(true);
    expect(isOutputSchemaCompatible("1.99")).toBe(true);
  });

  test("returns false when major mismatches", () => {
    expect(isOutputSchemaCompatible("0.9")).toBe(false);
    expect(isOutputSchemaCompatible("2.0")).toBe(false);
  });

  test("returns false for malformed input", () => {
    expect(isOutputSchemaCompatible("not-a-version")).toBe(false);
    expect(isOutputSchemaCompatible("1")).toBe(false); // missing minor
  });

  test("returns false for semver patch (e.g., '1.0.5')", () => {
    expect(isOutputSchemaCompatible("1.0.5")).toBe(false);
  });

  test("returns false for trailing whitespace (e.g., '1.0 ')", () => {
    expect(isOutputSchemaCompatible("1.0 ")).toBe(false);
  });

  test("returns false for trailing junk (e.g., '1.0extra')", () => {
    expect(isOutputSchemaCompatible("1.0extra")).toBe(false);
  });
});
