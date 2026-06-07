"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumericPropertyModification = void 0;
var ScenarioSetterType_1 = require("./ScenarioSetterType");
var NumericPropertyModification = /** @class */ (function () {
    function NumericPropertyModification(options) {
        var _a, _b;
        this.propertyName = options.propertyName;
        this.setterType = (_a = options.setterType) !== null && _a !== void 0 ? _a : ScenarioSetterType_1.ScenarioSetterType.EQUAL;
        this.newValue = (_b = options.newValue) !== null && _b !== void 0 ? _b : 0;
    }
    NumericPropertyModification.prototype.apply = function (currentValue) {
        switch (this.setterType) {
            case ScenarioSetterType_1.ScenarioSetterType.EQUAL: return this.newValue;
            case ScenarioSetterType_1.ScenarioSetterType.ADD: return currentValue + this.newValue;
            case ScenarioSetterType_1.ScenarioSetterType.SUBTRACT: return currentValue - this.newValue;
            case ScenarioSetterType_1.ScenarioSetterType.MULTIPLY: return currentValue * this.newValue;
            case ScenarioSetterType_1.ScenarioSetterType.DIVIDE:
                if (this.newValue === 0)
                    throw new Error("Division by zero");
                return currentValue / this.newValue;
            case ScenarioSetterType_1.ScenarioSetterType.MINIMUM: return Math.min(currentValue, this.newValue);
            case ScenarioSetterType_1.ScenarioSetterType.MAXIMUM: return Math.max(currentValue, this.newValue);
            default: return this.newValue;
        }
    };
    NumericPropertyModification.prototype.toJSON = function () {
        return {
            type: "numeric",
            propertyName: this.propertyName,
            setterType: this.setterType,
            newValue: this.newValue,
        };
    };
    NumericPropertyModification.fromJSON = function (data) {
        var _a, _b;
        return new NumericPropertyModification({
            propertyName: data.propertyName,
            setterType: (_a = data.setterType) !== null && _a !== void 0 ? _a : ScenarioSetterType_1.ScenarioSetterType.EQUAL,
            newValue: (_b = data.newValue) !== null && _b !== void 0 ? _b : 0,
        });
    };
    return NumericPropertyModification;
}());
exports.NumericPropertyModification = NumericPropertyModification;
