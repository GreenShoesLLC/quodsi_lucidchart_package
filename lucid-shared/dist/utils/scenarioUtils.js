"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.ensureBaselineScenario = void 0;
var Scenario_1 = require("../types/elements/Scenario");
var uuidUtils_1 = require("./uuidUtils");
/**
 * Ensure exactly one baseline scenario exists in the page's persisted
 * scenario list, and migrate any legacy zero-UUID baselines (predates
 * the database) to fresh UUIDs.
 *
 * Returns the (possibly modified) scenarios array along with two flags
 * the caller uses to decide whether to write back to Lucid storage:
 *   - baselineAdded: true when a missing baseline was synthesised
 *   - migrated: true when an existing scenario's id was rewritten
 */
function ensureBaselineScenario(scenarios) {
    var migrated = false;
    scenarios = scenarios.map(function (s) {
        if (s.id === Scenario_1.LEGACY_BASELINE_SCENARIO_ID) {
            migrated = true;
            return __assign(__assign({}, s), { id: (0, uuidUtils_1.generateUUID)() });
        }
        return s;
    });
    var hasBaseline = scenarios.some(function (s) { return s.isBaseline === true; });
    if (hasBaseline) {
        return { scenarios: scenarios, baselineAdded: false, migrated: migrated };
    }
    var baseline = Scenario_1.Scenario.createBaseline().toJSON();
    return {
        scenarios: __spreadArray([baseline], scenarios, true),
        baselineAdded: true,
        migrated: migrated,
    };
}
exports.ensureBaselineScenario = ensureBaselineScenario;
