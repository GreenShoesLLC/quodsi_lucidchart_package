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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var ConnectType_1 = require("../../types/elements/ConnectType");
var types_1 = require("../../quodsi-messaging/validation/types");
var ConnectorValidation = /** @class */ (function (_super) {
    __extends(ConnectorValidation, _super);
    function ConnectorValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConnectorValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var connectors = state.modelDefinition.connectors.getAll();
        var connectorsBySource = this.groupConnectorsBySource(connectors);
        this.log("Starting validation of individual connectors.");
        connectors.forEach(function (connector) {
            _this.validateConnectorEndpoints(connector, state, issues);
            _this.validateConnectorData(connector, issues);
        });
        this.log("Validating weight values for connector groups.");
        connectorsBySource.forEach(function (sourceConnectors, sourceId) {
            _this.validateWeightGroup(sourceId, sourceConnectors, state, issues);
        });
        this.log("Detecting circular references in connectors.");
        this.detectCircularReferences(state, issues);
        this.log("Completed validation of connectors.");
    };
    ConnectorValidation.prototype.groupConnectorsBySource = function (connectors) {
        var groups = new Map();
        connectors.forEach(function (connector) {
            var sourceConnectors = groups.get(connector.sourceId) || [];
            sourceConnectors.push(connector);
            groups.set(connector.sourceId, sourceConnectors);
        });
        return groups;
    };
    ConnectorValidation.prototype.validateConnectorEndpoints = function (connector, state, issues) {
        /**
         * Validates that the endpoints of a connector (source and target) are valid.
         */
        this.log("Validating endpoints for Connector ID: ".concat(connector.id));
        var sourceActivity = state.modelDefinition.activities.get(connector.sourceId);
        var sourceGenerator = state.modelDefinition.generators.get(connector.sourceId);
        if (!sourceActivity && !sourceGenerator) {
            this.log("Connector ID ".concat(connector.id, " has an invalid source ID: ").concat(connector.sourceId));
            issues.push(ValidationMessages_1.ValidationMessages.invalidConnection(connector.id, 'source', connector.sourceId));
        }
        var targetActivity = state.modelDefinition.activities.get(connector.targetId);
        if (!targetActivity) {
            this.log("Connector ID ".concat(connector.id, " has an invalid target ID: ").concat(connector.targetId));
            issues.push(ValidationMessages_1.ValidationMessages.invalidConnection(connector.id, 'target', connector.targetId));
        }
        if (connector.sourceId === connector.targetId) {
            this.log("Connector ID ".concat(connector.id, " is self-referencing."));
            issues.push(ValidationMessages_1.ValidationMessages.isolatedElement('Connector', connector.id));
        }
    };
    ConnectorValidation.prototype.validateConnectorData = function (connector, issues) {
        /**
         * Validates the data properties of a connector, including name, probability, and operation steps.
         */
        this.log("Validating data for Connector ID: ".concat(connector.id));
        if (!connector.name || connector.name.trim().length === 0) {
            this.log("Connector ID ".concat(connector.id, " has a missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('Connector', connector.id));
        }
        if (typeof connector.weight !== 'number' || connector.weight <= 0) {
            this.log("Connector ID ".concat(connector.id, " has an invalid weight: ").concat(connector.weight));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'invalid_connector_weight', "Connector ".concat(connector.id, " has invalid weight (must be greater than 0)"), connector.id));
        }
    };
    // Note: validateConnectorType removed - connectType is now on Activity, not Connector
    ConnectorValidation.prototype.validateWeightGroup = function (sourceId, connectors, state, issues) {
        /**
         * Validates the weight values of connectors originating from the same source.
         */
        var _this = this;
        this.log("Validating weight group for Source ID: ".concat(sourceId));
        // Get the source activity to check its connectType
        var sourceActivity = state.modelDefinition.activities.get(sourceId);
        // Only validate weights if the source is an Activity with Probability connectType
        if (!sourceActivity || sourceActivity.connectType !== ConnectType_1.ConnectType.Probability) {
            return;
        }
        // Check for zero or negative weights
        connectors.forEach(function (connector, idx) {
            if (!connector.weight || connector.weight <= 0) {
                _this.log("Connector ID ".concat(connector.id, " has invalid weight: ").concat(connector.weight));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'connector_invalid_weight', "Connector ".concat(idx + 1, " from activity ").concat(sourceId, " has weight ").concat(connector.weight || 0, ". Weight must be greater than 0."), connector.id));
            }
        });
        if (connectors.length > ConnectorValidation.MAX_OUTGOING_CONNECTIONS) {
            this.log("Source ID ".concat(sourceId, " has too many outgoing connections: ").concat(connectors.length));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'too_many_outgoing_connections', "Activity ".concat(sourceId, " has unusually high number of outgoing connections (").concat(connectors.length, ")"), sourceId));
        }
    };
    ConnectorValidation.prototype.detectCircularReferences = function (state, issues) {
        /**
         * Detects circular references in the graph of connectors.
         */
        var _this = this;
        this.log("Detecting circular references in connectors.");
        var visited = new Set();
        var stack = new Set();
        var detectCycle = function (nodeId, path) {
            if (path === void 0) { path = []; }
            if (stack.has(nodeId)) {
                _this.log("Circular reference detected: ".concat(__spreadArray(__spreadArray([], path, true), [nodeId], false).join(' -> ')));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'circular_reference', "Circular reference detected: ".concat(__spreadArray(__spreadArray([], path, true), [nodeId], false).join(' -> ')), nodeId));
                return true;
            }
            if (visited.has(nodeId))
                return false;
            visited.add(nodeId);
            stack.add(nodeId);
            var outgoingConnectors = state.modelDefinition.connectors.getAll()
                .filter(function (c) { return c.sourceId === nodeId; });
            for (var _i = 0, outgoingConnectors_1 = outgoingConnectors; _i < outgoingConnectors_1.length; _i++) {
                var connector = outgoingConnectors_1[_i];
                if (detectCycle(connector.targetId, __spreadArray(__spreadArray([], path, true), [nodeId], false))) {
                    return true;
                }
            }
            stack.delete(nodeId);
            return false;
        };
        state.modelDefinition.activities.getAll().forEach(function (activity) {
            if (!visited.has(activity.id)) {
                detectCycle(activity.id);
            }
        });
    };
    ConnectorValidation.MAX_OUTGOING_CONNECTIONS = 20;
    return ConnectorValidation;
}(ValidationRule_1.ValidationRule));
exports.ConnectorValidation = ConnectorValidation;
