"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioListManager = void 0;
var ScenarioListManager = /** @class */ (function () {
    function ScenarioListManager() {
        this.scenarios = new Map();
    }
    ScenarioListManager.prototype.add = function (scenario) {
        this.scenarios.set(scenario.id, scenario);
    };
    ScenarioListManager.prototype.remove = function (scenarioId) {
        return this.scenarios.delete(scenarioId);
    };
    ScenarioListManager.prototype.get = function (scenarioId) {
        return this.scenarios.get(scenarioId);
    };
    ScenarioListManager.prototype.getAll = function () {
        return Array.from(this.scenarios.values());
    };
    ScenarioListManager.prototype.size = function () {
        return this.scenarios.size;
    };
    ScenarioListManager.prototype.clear = function () {
        this.scenarios.clear();
    };
    return ScenarioListManager;
}());
exports.ScenarioListManager = ScenarioListManager;
