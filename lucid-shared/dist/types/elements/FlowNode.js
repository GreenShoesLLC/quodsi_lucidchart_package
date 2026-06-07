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
exports.FlowNode = void 0;
var PositionedSimulationObject_1 = require("./PositionedSimulationObject");
/**
 * Abstract base class for flow nodes in the simulation model.
 *
 * Flow nodes are the core building blocks of a simulation model:
 * - Generator: Creates entities and sends them into the flow
 * - Activity: Processes entities with optional resource requirements
 * - Connector: Routes entities between activities based on conditions
 *
 * All flow nodes share common properties:
 * - id: Unique identifier
 * - name: Human-readable name
 * - x, y: Position coordinates for visualization
 *
 * This class extends PositionedSimulationObject which provides the location
 * properties. It serves as a semantic grouping for flow-based components
 * that can be connected together to form a process flow.
 */
var FlowNode = /** @class */ (function (_super) {
    __extends(FlowNode, _super);
    function FlowNode() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FlowNode;
}(PositionedSimulationObject_1.PositionedSimulationObject));
exports.FlowNode = FlowNode;
