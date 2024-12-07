"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Activity = /** @class */ (function () {
    function Activity(id, name, capacity, inputBufferCapacity, outputBufferCapacity, operationSteps, connectors) {
        if (capacity === void 0) { capacity = 1; }
        if (inputBufferCapacity === void 0) { inputBufferCapacity = Infinity; }
        if (outputBufferCapacity === void 0) { outputBufferCapacity = Infinity; }
        if (operationSteps === void 0) { operationSteps = []; }
        if (connectors === void 0) { connectors = []; }
        this.id = id;
        this.name = name;
        this.capacity = capacity;
        this.inputBufferCapacity = inputBufferCapacity;
        this.outputBufferCapacity = outputBufferCapacity;
        this.operationSteps = operationSteps;
        this.connectors = connectors;
        this.type = SimulationObjectType_1.SimulationObjectType.Activity;
    }
    Activity.createDefault = function (id) {
        return new Activity(id, 'New Activity', 1, // capacity
        Infinity, // inputBufferCapacity
        Infinity, // outputBufferCapacity
        [], // operationSteps
        [] // connectors
        );
    };
    return Activity;
}());
exports.Activity = Activity;
