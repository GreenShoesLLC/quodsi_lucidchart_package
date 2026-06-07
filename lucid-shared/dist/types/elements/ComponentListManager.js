"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentListManager = void 0;
var ComponentListManager = /** @class */ (function () {
    function ComponentListManager(type) {
        this.items = new Map();
        this.type = type;
    }
    ComponentListManager.prototype.getNextName = function () {
        return "".concat(this.type, " ").concat(this.items.size + 1);
    };
    ComponentListManager.prototype.add = function (item) {
        this.items.set(item.id, item);
    };
    ComponentListManager.prototype.remove = function (id) {
        this.items.delete(id);
    };
    ComponentListManager.prototype.get = function (id) {
        return this.items.get(id);
    };
    ComponentListManager.prototype.getAll = function () {
        return Array.from(this.items.values());
    };
    ComponentListManager.prototype.clear = function () {
        this.items.clear();
    };
    ComponentListManager.prototype.size = function () {
        return this.items.size;
    };
    return ComponentListManager;
}());
exports.ComponentListManager = ComponentListManager;
