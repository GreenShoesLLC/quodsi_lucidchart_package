"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanPropertyModification = void 0;
var BooleanPropertyModification = /** @class */ (function () {
    function BooleanPropertyModification(options) {
        var _a;
        this.propertyName = options.propertyName;
        this.newValue = (_a = options.newValue) !== null && _a !== void 0 ? _a : true;
    }
    BooleanPropertyModification.prototype.apply = function (_currentValue) {
        return this.newValue;
    };
    BooleanPropertyModification.prototype.toJSON = function () {
        return {
            type: "boolean",
            propertyName: this.propertyName,
            newValue: this.newValue,
        };
    };
    BooleanPropertyModification.fromJSON = function (data) {
        var _a;
        return new BooleanPropertyModification({
            propertyName: data.propertyName,
            newValue: (_a = data.newValue) !== null && _a !== void 0 ? _a : true,
        });
    };
    return BooleanPropertyModification;
}());
exports.BooleanPropertyModification = BooleanPropertyModification;
