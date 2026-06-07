"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Duration = void 0;
var PeriodUnit_1 = require("./PeriodUnit");
var distributions_1 = require("./distributions");
var Duration = /** @class */ (function () {
    function Duration(durationPeriodUnit, distribution) {
        if (durationPeriodUnit === void 0) { durationPeriodUnit = PeriodUnit_1.PeriodUnit.MINUTES; }
        if (distribution === void 0) { distribution = distributions_1.ConstantDistribution.create(0); }
        this.durationPeriodUnit = durationPeriodUnit;
        this.distribution = distribution;
    }
    return Duration;
}());
exports.Duration = Duration;
