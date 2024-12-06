"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Entity = /** @class */ (function () {
    function Entity(id, name) {
        this.id = id;
        this.name = name;
        this.type = SimulationObjectType_1.SimulationObjectType.Entity;
    }
    return Entity;
}());
exports.Entity = Entity;
