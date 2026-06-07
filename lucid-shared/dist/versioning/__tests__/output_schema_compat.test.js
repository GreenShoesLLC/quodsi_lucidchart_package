"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var output_schema_compat_1 = require("../output_schema_compat");
var version_1 = require("../../constants/version");
describe("isOutputSchemaCompatible", function () {
    test("returns false for null", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)(null)).toBe(false);
    });
    test("returns false for undefined", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)(undefined)).toBe(false);
    });
    test("returns false for empty string", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("")).toBe(false);
    });
    test("returns true when major matches", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)(version_1.EXPECTED_OUTPUT_SCHEMA_VERSION)).toBe(true);
    });
    test("returns true when major matches and minor differs (forward-minor)", function () {
        // EXPECTED is "1.0"; "1.5" should still be compatible
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1.5")).toBe(true);
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1.99")).toBe(true);
    });
    test("returns false when major mismatches", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("0.9")).toBe(false);
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("2.0")).toBe(false);
    });
    test("returns false for malformed input", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("not-a-version")).toBe(false);
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1")).toBe(false); // missing minor
    });
    test("returns false for semver patch (e.g., '1.0.5')", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1.0.5")).toBe(false);
    });
    test("returns false for trailing whitespace (e.g., '1.0 ')", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1.0 ")).toBe(false);
    });
    test("returns false for trailing junk (e.g., '1.0extra')", function () {
        expect((0, output_schema_compat_1.isOutputSchemaCompatible)("1.0extra")).toBe(false);
    });
});
