"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Distribution = void 0;
var Distribution = /** @class */ (function () {
    function Distribution(distributionType, parameters, description) {
        if (description === void 0) { description = ""; }
        this.distributionType = distributionType;
        this.parameters = parameters;
        this.description = description;
    }
    return Distribution;
}());
exports.Distribution = Distribution;
