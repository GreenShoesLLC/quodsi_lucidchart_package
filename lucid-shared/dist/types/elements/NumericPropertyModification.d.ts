import { ScenarioPropertyName } from "./ScenarioPropertyName";
import { ScenarioSetterType } from "./ScenarioSetterType";
export declare class NumericPropertyModification {
    propertyName: ScenarioPropertyName;
    setterType: ScenarioSetterType;
    newValue: number;
    constructor(options: {
        propertyName: ScenarioPropertyName;
        setterType?: ScenarioSetterType;
        newValue?: number;
    });
    apply(currentValue: number): number;
    toJSON(): any;
    static fromJSON(data: any): NumericPropertyModification;
}
//# sourceMappingURL=NumericPropertyModification.d.ts.map