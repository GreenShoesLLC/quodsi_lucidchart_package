"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var OperationStep_1 = require("./OperationStep");
var PositionedSimulationObject_1 = require("./PositionedSimulationObject");
var Duration_1 = require("./Duration");
var PeriodUnit_1 = require("./PeriodUnit");
var distributions_1 = require("./distributions");
var Activity = /** @class */ (function (_super) {
    __extends(Activity, _super);
    function Activity(id, name, capacity, inputBufferCapacity, outputBufferCapacity, operationSteps, x, y) {
        if (capacity === void 0) { capacity = 1; }
        if (inputBufferCapacity === void 0) { inputBufferCapacity = 1; }
        if (outputBufferCapacity === void 0) { outputBufferCapacity = 1; }
        if (operationSteps === void 0) { operationSteps = []; }
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.capacity = capacity;
        _this.inputBufferCapacity = inputBufferCapacity;
        _this.outputBufferCapacity = outputBufferCapacity;
        _this.operationSteps = operationSteps;
        _this.type = SimulationObjectType_1.SimulationObjectType.Activity;
        // Set location using inherited method
        _this.setLocation(x, y);
        return _this;
    }
    Activity.createDefault = function (id, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var defaultDuration = new Duration_1.Duration(PeriodUnit_1.PeriodUnit.MINUTES, distributions_1.ConstantDistribution.create(1));
        var defaultOperationStep = (0, OperationStep_1.createOperationStep)(defaultDuration);
        var activity = new Activity(id, 'New Activity', 1, // capacity
        1, // inputBufferCapacity
        1, // outputBufferCapacity
        [defaultOperationStep]);
        // Set location using inherited method
        activity.setLocation(x, y);
        return activity;
    };
    return Activity;
}(PositionedSimulationObject_1.PositionedSimulationObject));
exports.Activity = Activity;
