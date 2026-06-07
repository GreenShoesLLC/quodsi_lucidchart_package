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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTransforms = void 0;
var uuidUtils_1 = require("../../utils/uuidUtils");
/**
 * Transformations for Activity objects
 */
exports.ActivityTransforms = {
    objectType: 'Activity',
    transformations: [
        {
            sourceVersion: '2026.02.03',
            targetVersion: '2026.02.07',
            transform: function (data) {
                var _a;
                return (__assign(__assign({}, data), { description: (_a = data.description) !== null && _a !== void 0 ? _a : '' }));
            }
        },
        {
            sourceVersion: '2026.02.15',
            targetVersion: '2026.02.22',
            transform: function (data) { return (__assign({}, data
            // failureProperties is optional — absence means "disabled"
            // No default injection needed; identity transform for version hop
            )); }
        },
        {
            sourceVersion: '2026.02.22',
            targetVersion: '2026.02.23',
            transform: function (data) { return (__assign({}, data
            // Identity transform — establishes version boundary for scenario adoption.
            // Scenarios are additive (stored in q_scenarios, not per-element).
            )); }
        },
        {
            sourceVersion: '2026.03.01',
            targetVersion: '2026.03.08',
            transform: function (data) { return (__assign({}, data
            // stateCondition added to all action types as optional field.
            // Absence means no guard — identity transform for version hop.
            )); }
        },
        {
            sourceVersion: '2026.05.26',
            targetVersion: '2026.05.31',
            // Backfill stable ids onto actions that predate action identity.
            // Identity for activities without actions.
            // Note: only top-level data.actions are backfilled; nested actions inside
            // LOOP/BRANCH action data are intentionally out of scope for this hop.
            transform: function (data) {
                if (!Array.isArray(data.actions))
                    return data;
                return __assign(__assign({}, data), { actions: data.actions.map(function (a) {
                        return a && !a.id ? __assign(__assign({}, a), { id: (0, uuidUtils_1.generateUUID)() }) : a;
                    }) });
            }
        }
    ]
};
