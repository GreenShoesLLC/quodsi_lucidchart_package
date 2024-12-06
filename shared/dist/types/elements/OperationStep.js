"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationStep = void 0;
var Duration_1 = require("./Duration");
var OperationStep = /** @class */ (function () {
    function OperationStep(resourceSetRequest, duration) {
        if (resourceSetRequest === void 0) { resourceSetRequest = null; }
        if (duration === void 0) { duration = new Duration_1.Duration(); }
        this.resourceSetRequest = resourceSetRequest;
        this.duration = duration;
    }
    return OperationStep;
}());
exports.OperationStep = OperationStep;
