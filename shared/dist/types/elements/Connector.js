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
exports.Connector = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var ConnectType_1 = require("./ConnectType");
var PositionedSimulationObject_1 = require("./PositionedSimulationObject");
var Connector = /** @class */ (function (_super) {
    __extends(Connector, _super);
    function Connector(id, name, sourceId, targetId, probability, connectType, operationSteps, sourceX, sourceY, targetX, targetY, x, y) {
        if (probability === void 0) { probability = 1.0; }
        if (connectType === void 0) { connectType = ConnectType_1.ConnectType.Probability; }
        if (operationSteps === void 0) { operationSteps = []; }
        if (sourceX === void 0) { sourceX = 0; }
        if (sourceY === void 0) { sourceY = 0; }
        if (targetX === void 0) { targetX = 0; }
        if (targetY === void 0) { targetY = 0; }
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.sourceId = sourceId;
        _this.targetId = targetId;
        _this.probability = probability;
        _this.connectType = connectType;
        _this.operationSteps = operationSteps;
        _this.type = SimulationObjectType_1.SimulationObjectType.Connector;
        // Add source and target location properties
        _this.sourceX = 0;
        _this.sourceY = 0;
        _this.targetX = 0;
        _this.targetY = 0;
        // Set source and target coordinates
        _this.sourceX = sourceX;
        _this.sourceY = sourceY;
        _this.targetX = targetX;
        _this.targetY = targetY;
        // Set location to midpoint by default
        _this.setLocation(x || (sourceX + targetX) / 2, y || (sourceY + targetY) / 2);
        return _this;
    }
    Connector.createDefault = function (id, sourceX, sourceY, targetX, targetY) {
        if (sourceX === void 0) { sourceX = 0; }
        if (sourceY === void 0) { sourceY = 0; }
        if (targetX === void 0) { targetX = 0; }
        if (targetY === void 0) { targetY = 0; }
        var connector = new Connector(id, 'New Connector', '', // sourceId
        '', // targetId
        1.0, // probability
        ConnectType_1.ConnectType.Probability, // connectType
        [] // operationSteps
        );
        // Set source and target coordinates
        connector.sourceX = sourceX;
        connector.sourceY = sourceY;
        connector.targetX = targetX;
        connector.targetY = targetY;
        // Set midpoint as default location
        connector.setLocation((sourceX + targetX) / 2, (sourceY + targetY) / 2);
        return connector;
    };
    /**
     * Update source location
     */
    Connector.prototype.setSourceLocation = function (x, y) {
        this.sourceX = x;
        this.sourceY = y;
        // Recalculate midpoint
        this.setLocation((this.sourceX + this.targetX) / 2, (this.sourceY + this.targetY) / 2);
    };
    /**
     * Update target location
     */
    Connector.prototype.setTargetLocation = function (x, y) {
        this.targetX = x;
        this.targetY = y;
        // Recalculate midpoint
        this.setLocation((this.sourceX + this.targetX) / 2, (this.sourceY + this.targetY) / 2);
    };
    return Connector;
}(PositionedSimulationObject_1.PositionedSimulationObject));
exports.Connector = Connector;
