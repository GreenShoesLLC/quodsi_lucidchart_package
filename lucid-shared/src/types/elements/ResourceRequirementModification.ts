import { ScenarioPropertyName } from "./ScenarioPropertyName";

/**
 * Swaps the resource requirement an action (Seize / Release / DelayWithResource)
 * points at. Reference swap, discriminator type:"reference". Mirrors the engine's
 * ResourceRequirementPropertyModification.
 */
export class ResourceRequirementModification {
    propertyName: ScenarioPropertyName;
    resourceRequirementId: string;

    constructor(options: { propertyName: ScenarioPropertyName; resourceRequirementId: string }) {
        this.propertyName = options.propertyName;
        this.resourceRequirementId = options.resourceRequirementId;
    }

    toJSON(): any {
        return { type: "reference", propertyName: this.propertyName, resourceRequirementId: this.resourceRequirementId };
    }

    static fromJSON(data: any): ResourceRequirementModification {
        return new ResourceRequirementModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            resourceRequirementId: data.resourceRequirementId ?? "",
        });
    }
}
