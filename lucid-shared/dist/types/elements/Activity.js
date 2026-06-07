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
var FlowNode_1 = require("./FlowNode");
var Duration_1 = require("./Duration");
var PeriodUnit_1 = require("./PeriodUnit");
var distributions_1 = require("./distributions");
var ConnectType_1 = require("./ConnectType");
var DelayWithResourceAction_1 = require("./actions/DelayWithResourceAction");
var Activity = /** @class */ (function (_super) {
    __extends(Activity, _super);
    function Activity(id, name, capacity, inboundQueueCapacity, outboundQueueCapacity, actions, x, y) {
        if (capacity === void 0) { capacity = 1; }
        if (inboundQueueCapacity === void 0) { inboundQueueCapacity = 1; }
        if (outboundQueueCapacity === void 0) { outboundQueueCapacity = 1; }
        if (actions === void 0) { actions = []; }
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.capacity = capacity;
        _this.inboundQueueCapacity = inboundQueueCapacity;
        _this.outboundQueueCapacity = outboundQueueCapacity;
        _this.type = SimulationObjectType_1.SimulationObjectType.Activity;
        // ========== NEW ACTION SYSTEM ==========
        /**
         * Actions to perform when processing entities.
         * This is the new action-based system that replaces operationSteps.
         *
         * When actions is populated, it takes precedence over operationSteps
         * and pre/post processing state modifications.
         */
        _this.actions = [];
        /**
         * Connect type for routing decisions from this activity
         */
        _this.connectType = ConnectType_1.ConnectType.Probability;
        _this.description = '';
        _this.actions = actions;
        // Set location using inherited method
        _this.setLocation(x, y);
        return _this;
    }
    Activity.createDefault = function (id, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var defaultDuration = new Duration_1.Duration(PeriodUnit_1.PeriodUnit.MINUTES, distributions_1.ConstantDistribution.create(1));
        var defaultAction = (0, DelayWithResourceAction_1.createDelayWithResourceAction)(defaultDuration);
        var activity = new Activity(id, 'New Activity', 1, // capacity
        999999, // inboundQueueCapacity
        999999, // outboundQueueCapacity
        [defaultAction], // actions
        x, y);
        return activity;
    };
    return Activity;
}(FlowNode_1.FlowNode));
exports.Activity = Activity;
