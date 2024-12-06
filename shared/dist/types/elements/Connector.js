"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var ConnectType_1 = require("./ConnectType");
var Connector = /** @class */ (function () {
    function Connector(id, name, sourceId, targetId, probability, connectType, operationSteps) {
        if (probability === void 0) { probability = 1.0; }
        if (connectType === void 0) { connectType = ConnectType_1.ConnectType.Probability; }
        if (operationSteps === void 0) { operationSteps = []; }
        this.id = id;
        this.name = name;
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.probability = probability;
        this.connectType = connectType;
        this.operationSteps = operationSteps;
        this.type = SimulationObjectType_1.SimulationObjectType.Connector;
    }
    return Connector;
}());
exports.Connector = Connector;
