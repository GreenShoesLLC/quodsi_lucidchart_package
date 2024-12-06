"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Duration = void 0;
var PeriodUnit_1 = require("./PeriodUnit");
var DurationType_1 = require("./DurationType");
var Duration = /** @class */ (function () {
    function Duration(durationLength, durationPeriodUnit, durationType, distribution) {
        if (durationLength === void 0) { durationLength = 0.0; }
        if (durationPeriodUnit === void 0) { durationPeriodUnit = PeriodUnit_1.PeriodUnit.MINUTES; }
        if (durationType === void 0) { durationType = DurationType_1.DurationType.CONSTANT; }
        if (distribution === void 0) { distribution = null; }
        this.durationLength = durationLength;
        this.durationPeriodUnit = durationPeriodUnit;
        this.durationType = durationType;
        this.distribution = distribution;
    }
    return Duration;
}());
exports.Duration = Duration;
