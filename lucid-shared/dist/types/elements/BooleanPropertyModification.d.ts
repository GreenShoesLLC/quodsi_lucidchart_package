import { ScenarioPropertyName } from "./ScenarioPropertyName";
export declare class BooleanPropertyModification {
    propertyName: ScenarioPropertyName;
    newValue: boolean;
    constructor(options: {
        propertyName: ScenarioPropertyName;
        newValue?: boolean;
    });
    apply(_currentValue: boolean): boolean;
    toJSON(): any;
    static fromJSON(data: any): BooleanPropertyModification;
}
//# sourceMappingURL=BooleanPropertyModification.d.ts.map