import { ScenarioPropertyName } from "./ScenarioPropertyName";
/**
 * Swaps the resource requirement an action (Seize / Release / DelayWithResource)
 * points at. Reference swap, discriminator type:"reference". Mirrors the engine's
 * ResourceRequirementPropertyModification.
 */
export declare class ResourceRequirementModification {
    propertyName: ScenarioPropertyName;
    resourceRequirementId: string;
    constructor(options: {
        propertyName: ScenarioPropertyName;
        resourceRequirementId: string;
    });
    toJSON(): any;
    static fromJSON(data: any): ResourceRequirementModification;
}
//# sourceMappingURL=ResourceRequirementModification.d.ts.map