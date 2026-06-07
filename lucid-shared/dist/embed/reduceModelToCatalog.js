"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduceModelToCatalog = void 0;
function idName(x) {
    return { id: x.id, name: x.name };
}
function reduceModelToCatalog(model) {
    var _a, _b, _c, _d, _e, _f, _g;
    var connectorMap = new Map();
    for (var _i = 0, _h = (_a = model.activities) !== null && _a !== void 0 ? _a : []; _i < _h.length; _i++) {
        var a = _h[_i];
        for (var _j = 0, _k = (_b = a.connectors) !== null && _b !== void 0 ? _b : []; _j < _k.length; _j++) {
            var c = _k[_j];
            if (c && c.id && !connectorMap.has(c.id))
                connectorMap.set(c.id, { id: c.id, name: c.name });
        }
    }
    return {
        activities: ((_c = model.activities) !== null && _c !== void 0 ? _c : []).map(function (a) {
            var _a;
            return ({
                id: a.id,
                name: a.name,
                actions: ((_a = a.actions) !== null && _a !== void 0 ? _a : []).map(function (act) {
                    var out = {
                        id: act.id,
                        actionType: act.actionType,
                    };
                    if ('duration' in act && act.duration !== undefined) {
                        out.duration = act.duration;
                    }
                    if ('resourceRequirementId' in act) {
                        out.resourceRequirementId = act.resourceRequirementId;
                    }
                    return out;
                }),
            });
        }),
        resources: ((_d = model.resources) !== null && _d !== void 0 ? _d : []).map(idName),
        resourceRequirements: ((_e = model.resourceRequirements) !== null && _e !== void 0 ? _e : []).map(idName),
        generators: ((_f = model.generators) !== null && _f !== void 0 ? _f : []).map(function (g) { return ({
            id: g.id,
            name: g.name,
            generationConfig: g.generationConfig
                ? { periodIntervalDuration: g.generationConfig.periodIntervalDuration }
                : undefined,
        }); }),
        connectors: Array.from(connectorMap.values()),
        entities: ((_g = model.entities) !== null && _g !== void 0 ? _g : []).map(idName),
    };
}
exports.reduceModelToCatalog = reduceModelToCatalog;
