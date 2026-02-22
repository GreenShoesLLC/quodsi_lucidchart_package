import { ScenarioPropertyName } from "./ScenarioPropertyName";

export class BooleanPropertyModification {
    propertyName: ScenarioPropertyName;
    newValue: boolean;

    constructor(options: {
        propertyName: ScenarioPropertyName;
        newValue?: boolean;
    }) {
        this.propertyName = options.propertyName;
        this.newValue = options.newValue ?? true;
    }

    apply(_currentValue: boolean): boolean {
        return this.newValue;
    }

    toJSON(): any {
        return {
            type: "boolean",
            propertyName: this.propertyName,
            newValue: this.newValue,
        };
    }

    static fromJSON(data: any): BooleanPropertyModification {
        return new BooleanPropertyModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            newValue: data.newValue ?? true,
        });
    }
}
