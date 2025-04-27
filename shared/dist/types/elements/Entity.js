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
exports.Entity = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var PositionedSimulationObject_1 = require("./PositionedSimulationObject");
var Entity = /** @class */ (function (_super) {
    __extends(Entity, _super);
    function Entity(id, name, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.type = SimulationObjectType_1.SimulationObjectType.Entity;
        // Set location using inherited method
        _this.setLocation(x, y);
        return _this;
    }
    Entity.createDefault = function (id, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var entity = new Entity(id, 'New Entity', x, y);
        return entity;
    };
    return Entity;
}(PositionedSimulationObject_1.PositionedSimulationObject));
exports.Entity = Entity;
