"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationStep = void 0;
function createOperationStep(duration, // duration required parameter
options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    return {
        requirementId: (_a = options.requirementId) !== null && _a !== void 0 ? _a : null,
        quantity: (_b = options.quantity) !== null && _b !== void 0 ? _b : 1,
        duration: duration
    };
}
exports.createOperationStep = createOperationStep;
