import { DistributionType } from '@quodsi/shared';
import {
    canRateScale,
    validateRateMultiplier,
} from "@quodsi/shared";

describe("canRateScale", () => {
    it("returns true for CONSTANT", () => {
        expect(canRateScale(DistributionType.CONSTANT)).toBe(true);
    });

    it("returns true for UNIFORM", () => {
        expect(canRateScale(DistributionType.UNIFORM)).toBe(true);
    });

    it("returns true for TRIANGULAR", () => {
        expect(canRateScale(DistributionType.TRIANGULAR)).toBe(true);
    });

    it("returns true for NORMAL", () => {
        expect(canRateScale(DistributionType.NORMAL)).toBe(true);
    });

    it("returns true for EXPONENTIAL", () => {
        expect(canRateScale(DistributionType.EXPONENTIAL)).toBe(true);
    });

    it("returns true for GAMMA", () => {
        expect(canRateScale(DistributionType.GAMMA)).toBe(true);
    });

    it("returns true for LOGNORMAL", () => {
        expect(canRateScale(DistributionType.LOGNORMAL)).toBe(true);
    });

    it("returns false for BETA", () => {
        expect(canRateScale(DistributionType.BETA)).toBe(false);
    });

    it("returns false for WEIBULL", () => {
        expect(canRateScale(DistributionType.WEIBULL)).toBe(false);
    });
});

describe("validateRateMultiplier", () => {
    // -------------------------------------------------------------------------
    // factor validation (no distribution context)
    // -------------------------------------------------------------------------
    it("rejects 0", () => {
        const r = validateRateMultiplier(0, undefined);
        expect(r.valid).toBe(false);
        expect(r.error).toBeDefined();
    });

    it("rejects negative factor", () => {
        const r = validateRateMultiplier(-2, undefined);
        expect(r.valid).toBe(false);
        expect(r.error).toBeDefined();
    });

    it("rejects NaN", () => {
        const r = validateRateMultiplier(NaN, undefined);
        expect(r.valid).toBe(false);
        expect(r.error).toBeDefined();
    });

    it("rejects Infinity", () => {
        const r = validateRateMultiplier(Infinity, undefined);
        expect(r.valid).toBe(false);
        expect(r.error).toBeDefined();
    });

    it("warns when factor is 1", () => {
        const r = validateRateMultiplier(1, undefined);
        expect(r.valid).toBe(true);
        expect(r.warning).toBeDefined();
        expect(r.warning).toContain("no effect");
    });

    it("warns when factor is 1 with scalable distribution", () => {
        const r = validateRateMultiplier(1, DistributionType.EXPONENTIAL);
        expect(r.valid).toBe(true);
        expect(r.warning).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // distribution-type rejection
    // -------------------------------------------------------------------------
    it("errors when distribution is BETA (cannot be rate-scaled)", () => {
        const r = validateRateMultiplier(2, DistributionType.BETA);
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/cannot/i);
    });

    it("errors when distribution is WEIBULL (cannot be rate-scaled)", () => {
        const r = validateRateMultiplier(2, DistributionType.WEIBULL);
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/cannot/i);
    });

    // -------------------------------------------------------------------------
    // happy-path accepts
    // -------------------------------------------------------------------------
    it("accepts factor=2 with EXPONENTIAL", () => {
        const r = validateRateMultiplier(2, DistributionType.EXPONENTIAL);
        expect(r.valid).toBe(true);
        expect(r.error).toBeUndefined();
        expect(r.warning).toBeUndefined();
    });

    it("accepts factor=0.5 with NORMAL", () => {
        const r = validateRateMultiplier(0.5, DistributionType.NORMAL);
        expect(r.valid).toBe(true);
    });

    it("accepts factor=2 with undefined distribution", () => {
        const r = validateRateMultiplier(2, undefined);
        expect(r.valid).toBe(true);
        expect(r.error).toBeUndefined();
    });
});
