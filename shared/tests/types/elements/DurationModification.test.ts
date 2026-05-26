import { DurationModification, DurationModificationMode, SerializedDuration } from "../../../src/types/elements/DurationModification";
import { ScenarioPropertyName } from "../../../src/types/elements/ScenarioPropertyName";
import { ScenarioChangeRequest } from "../../../src/types/elements/ScenarioChangeRequest";
import { ScenarioObjectType } from "../../../src/types/elements/ScenarioObjectType";

const PROPERTY = ScenarioPropertyName.INTERARRIVAL_TIMING;

const sampleDuration: SerializedDuration = {
    durationPeriodUnit: "MINUTES",
    distribution: {
        distributionType: "EXPONENTIAL",
        parameters: { mean: 5 },
        description: "5-minute exponential inter-arrival",
    },
};

describe("DurationModification", () => {
    describe("toJSON – scaleRate mode", () => {
        it("includes type, propertyName, mode, and factor", () => {
            const mod = new DurationModification({
                propertyName: PROPERTY,
                mode: "scaleRate",
                factor: 1.5,
            });
            const json = mod.toJSON();
            expect(json.type).toBe("duration");
            expect(json.propertyName).toBe(PROPERTY);
            expect(json.mode).toBe("scaleRate");
            expect(json.factor).toBe(1.5);
        });

        it("does NOT include duration key in scaleRate mode", () => {
            const mod = new DurationModification({
                propertyName: PROPERTY,
                mode: "scaleRate",
                factor: 2,
            });
            const json = mod.toJSON();
            expect(Object.prototype.hasOwnProperty.call(json, "duration")).toBe(false);
        });
    });

    describe("toJSON – setDistribution mode", () => {
        it("includes type, propertyName, mode, and duration", () => {
            const mod = new DurationModification({
                propertyName: PROPERTY,
                mode: "setDistribution",
                duration: sampleDuration,
            });
            const json = mod.toJSON();
            expect(json.type).toBe("duration");
            expect(json.propertyName).toBe(PROPERTY);
            expect(json.mode).toBe("setDistribution");
            expect(json.duration).toEqual(sampleDuration);
        });

        it("does NOT include factor key in setDistribution mode", () => {
            const mod = new DurationModification({
                propertyName: PROPERTY,
                mode: "setDistribution",
                duration: sampleDuration,
            });
            const json = mod.toJSON();
            expect(Object.prototype.hasOwnProperty.call(json, "factor")).toBe(false);
        });
    });

    describe("fromJSON", () => {
        it("reconstructs a scaleRate instance correctly", () => {
            const data = {
                type: "duration",
                propertyName: PROPERTY,
                mode: "scaleRate",
                factor: 0.75,
            };
            const mod = DurationModification.fromJSON(data);
            expect(mod).toBeInstanceOf(DurationModification);
            expect(mod.propertyName).toBe(PROPERTY);
            expect(mod.mode).toBe("scaleRate");
            expect(mod.factor).toBe(0.75);
            expect(mod.duration).toBeUndefined();
        });

        it("reconstructs a setDistribution instance correctly", () => {
            const data = {
                type: "duration",
                propertyName: PROPERTY,
                mode: "setDistribution",
                duration: sampleDuration,
            };
            const mod = DurationModification.fromJSON(data);
            expect(mod).toBeInstanceOf(DurationModification);
            expect(mod.mode).toBe("setDistribution");
            expect(mod.duration?.distribution.distributionType).toBe("EXPONENTIAL");
            expect(mod.factor).toBeUndefined();
        });
    });
});

describe("ScenarioChangeRequest.fromJSON with DurationModification", () => {
    const baseRequest = {
        id: "req-1",
        objectType: ScenarioObjectType.GENERATOR,
        objectMatchCriteria: { nameContains: "Arrivals" },
        description: "Scale arrival rate",
    };

    it("dispatches to DurationModification for type='duration' scaleRate", () => {
        const payload = {
            ...baseRequest,
            modificationDetails: {
                type: "duration",
                propertyName: PROPERTY,
                mode: "scaleRate",
                factor: 2.0,
            },
        };
        const req = ScenarioChangeRequest.fromJSON(payload);
        expect(req.modificationDetails).toBeInstanceOf(DurationModification);
        const mod = req.modificationDetails as DurationModification;
        expect(mod.factor).toBe(2.0);
        expect(mod.mode).toBe("scaleRate");
    });

    it("round-trips a scaleRate request via toJSON", () => {
        const payload = {
            ...baseRequest,
            modificationDetails: {
                type: "duration",
                propertyName: PROPERTY,
                mode: "scaleRate",
                factor: 3.0,
            },
        };
        const req = ScenarioChangeRequest.fromJSON(payload);
        const json = req.toJSON();
        expect(json.modificationDetails.type).toBe("duration");
        expect(json.modificationDetails.mode).toBe("scaleRate");
        expect(json.modificationDetails.factor).toBe(3.0);
    });

    it("dispatches to DurationModification for type='duration' setDistribution", () => {
        const payload = {
            ...baseRequest,
            modificationDetails: {
                type: "duration",
                propertyName: PROPERTY,
                mode: "setDistribution",
                duration: sampleDuration,
            },
        };
        const req = ScenarioChangeRequest.fromJSON(payload);
        expect(req.modificationDetails).toBeInstanceOf(DurationModification);
        const mod = req.modificationDetails as DurationModification;
        expect(mod.mode).toBe("setDistribution");
        expect(mod.duration?.distribution.distributionType).toBe("EXPONENTIAL");
        expect(mod.duration?.distribution.parameters.mean).toBe(5);
    });
});
