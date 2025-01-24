"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var OperationStep_1 = require("./OperationStep");
var Duration_1 = require("./Duration");
var PeriodUnit_1 = require("./PeriodUnit");
var DurationType_1 = require("./DurationType");
var Activity = /** @class */ (function () {
    function Activity(id, name, capacity, inputBufferCapacity, outputBufferCapacity, operationSteps) {
        if (capacity === void 0) { capacity = 1; }
        if (inputBufferCapacity === void 0) { inputBufferCapacity = 1; }
        if (outputBufferCapacity === void 0) { outputBufferCapacity = 1; }
        if (operationSteps === void 0) { operationSteps = []; }
        this.id = id;
        this.name = name;
        this.capacity = capacity;
        this.inputBufferCapacity = inputBufferCapacity;
        this.outputBufferCapacity = outputBufferCapacity;
        this.operationSteps = operationSteps;
        this.type = SimulationObjectType_1.SimulationObjectType.Activity;
    }
    Activity.createDefault = function (id) {
        var defaultDuration = new Duration_1.Duration(1, PeriodUnit_1.PeriodUnit.MINUTES, DurationType_1.DurationType.CONSTANT);
        var defaultOperationStep = (0, OperationStep_1.createOperationStep)(defaultDuration);
        return new Activity(id, 'New Activity', 1, // capacity
        1, // inputBufferCapacity
        1, // outputBufferCapacity
        [defaultOperationStep]);
    };
    return Activity;
}());
exports.Activity = Activity;
