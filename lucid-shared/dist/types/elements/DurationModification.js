"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurationModification = void 0;
var DurationModification = /** @class */ (function () {
    function DurationModification(options) {
        this.propertyName = options.propertyName;
        this.mode = options.mode;
        this.factor = options.factor;
        this.duration = options.duration;
    }
    DurationModification.prototype.toJSON = function () {
        return __assign(__assign({ type: "duration", propertyName: this.propertyName, mode: this.mode }, (this.mode === "scaleRate" ? { factor: this.factor } : {})), (this.mode === "setDistribution" ? { duration: this.duration } : {}));
    };
    DurationModification.fromJSON = function (data) {
        return new DurationModification({
            propertyName: data.propertyName,
            mode: data.mode,
            factor: data.factor,
            duration: data.duration,
        });
    };
    return DurationModification;
}());
exports.DurationModification = DurationModification;
