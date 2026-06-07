import { ScenarioPropertyName } from "./ScenarioPropertyName";
import { ScenarioSetterType } from "./ScenarioSetterType";

export class NumericPropertyModification {
    propertyName: ScenarioPropertyName;
    setterType: ScenarioSetterType;
    newValue: number;

    constructor(options: {
        propertyName: ScenarioPropertyName;
        setterType?: ScenarioSetterType;
        newValue?: number;
    }) {
        this.propertyName = options.propertyName;
        this.setterType = options.setterType ?? ScenarioSetterType.EQUAL;
        this.newValue = options.newValue ?? 0;
    }

    apply(currentValue: number): number {
        switch (this.setterType) {
            case ScenarioSetterType.EQUAL: return this.newValue;
            case ScenarioSetterType.ADD: return currentValue + this.newValue;
            case ScenarioSetterType.SUBTRACT: return currentValue - this.newValue;
            case ScenarioSetterType.MULTIPLY: return currentValue * this.newValue;
            case ScenarioSetterType.DIVIDE:
                if (this.newValue === 0) throw new Error("Division by zero");
                return currentValue / this.newValue;
            case ScenarioSetterType.MINIMUM: return Math.min(currentValue, this.newValue);
            case ScenarioSetterType.MAXIMUM: return Math.max(currentValue, this.newValue);
            default: return this.newValue;
        }
    }

    toJSON(): any {
        return {
            type: "numeric",
            propertyName: this.propertyName,
            setterType: this.setterType,
            newValue: this.newValue,
        };
    }

    static fromJSON(data: any): NumericPropertyModification {
        return new NumericPropertyModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            setterType: data.setterType as ScenarioSetterType ?? ScenarioSetterType.EQUAL,
            newValue: data.newValue ?? 0,
        });
    }
}
