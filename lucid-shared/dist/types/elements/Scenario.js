"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scenario = exports.LEGACY_BASELINE_SCENARIO_ID = void 0;
var ScenarioChangeRequest_1 = require("./ScenarioChangeRequest");
var uuidUtils_1 = require("../../utils/uuidUtils");
/**
 * Legacy sentinel id used as the baseline scenario's `id` before
 * scenarios were persisted to a database. Two documents both stuck
 * with this id would collide on the global PK in `dbo.scenarios`.
 * New baselines now use real UUIDs; baseline-ness is identified via
 * the `isBaseline` flag, not the id. Kept exported solely so that
 * `ensureBaselineScenario` can recognise legacy serialised data and
 * migrate it on load.
 */
exports.LEGACY_BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';
var Scenario = /** @class */ (function () {
    function Scenario(options) {
        var _a, _b, _c, _d, _e;
        this.id = (_a = options === null || options === void 0 ? void 0 : options.id) !== null && _a !== void 0 ? _a : (0, uuidUtils_1.generateUUID)();
        this.name = (_b = options === null || options === void 0 ? void 0 : options.name) !== null && _b !== void 0 ? _b : "New Scenario";
        this.description = (_c = options === null || options === void 0 ? void 0 : options.description) !== null && _c !== void 0 ? _c : "";
        this.isBaseline = (_d = options === null || options === void 0 ? void 0 : options.isBaseline) !== null && _d !== void 0 ? _d : false;
        this.changeRequests = (_e = options === null || options === void 0 ? void 0 : options.changeRequests) !== null && _e !== void 0 ? _e : [];
    }
    Scenario.prototype.addChangeRequest = function (changeRequest) {
        this.changeRequests.push(changeRequest);
    };
    Scenario.prototype.removeChangeRequest = function (changeRequestId) {
        this.changeRequests = this.changeRequests.filter(function (cr) { return cr.id !== changeRequestId; });
    };
    Scenario.prototype.toJSON = function () {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            isBaseline: this.isBaseline,
            changeRequests: this.changeRequests.map(function (cr) { return cr.toJSON(); }),
        };
    };
    Scenario.fromJSON = function (data) {
        var _a, _b, _c, _d;
        return new Scenario({
            id: data.id,
            name: (_a = data.name) !== null && _a !== void 0 ? _a : "New Scenario",
            description: (_b = data.description) !== null && _b !== void 0 ? _b : "",
            isBaseline: (_c = data.isBaseline) !== null && _c !== void 0 ? _c : false,
            changeRequests: ((_d = data.changeRequests) !== null && _d !== void 0 ? _d : []).map(function (cr) { return ScenarioChangeRequest_1.ScenarioChangeRequest.fromJSON(cr); }),
        });
    };
    Scenario.createBaseline = function () {
        // id omitted -> constructor calls generateUUID(). Baselines are
        // identified by isBaseline === true, not by a sentinel id.
        return new Scenario({
            name: "Baseline",
            description: "No scenario changes",
            changeRequests: [],
            isBaseline: true,
        });
    };
    return Scenario;
}());
exports.Scenario = Scenario;
