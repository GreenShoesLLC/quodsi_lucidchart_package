"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Resource = /** @class */ (function () {
    function Resource(id, name, capacity) {
        if (capacity === void 0) { capacity = 1; }
        this.id = id;
        this.name = name;
        this.capacity = capacity;
        this.type = SimulationObjectType_1.SimulationObjectType.Resource;
    }
    return Resource;
}());
exports.Resource = Resource;
