"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSplitAction = exports.createSplitAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a SplitAction with default values.
 *
 * @param count Number of entities to create (default: 1)
 * @param options Optional configuration for the split action
 */
function createSplitAction(count, options, id) {
    var _a, _b, _c, _d, _e, _f;
    if (count === void 0) { count = 1; }
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.SPLIT,
        count: count,
        entityTemplateId: (_a = options === null || options === void 0 ? void 0 : options.entityTemplateId) !== null && _a !== void 0 ? _a : null,
        destinationId: (_b = options === null || options === void 0 ? void 0 : options.destinationId) !== null && _b !== void 0 ? _b : null,
        inheritStates: (_c = options === null || options === void 0 ? void 0 : options.inheritStates) !== null && _c !== void 0 ? _c : [],
        modifications: (_d = options === null || options === void 0 ? void 0 : options.modifications) !== null && _d !== void 0 ? _d : [],
        splitIndexState: (_e = options === null || options === void 0 ? void 0 : options.splitIndexState) !== null && _e !== void 0 ? _e : null,
        stateCondition: (_f = options === null || options === void 0 ? void 0 : options.stateCondition) !== null && _f !== void 0 ? _f : null
    };
}
exports.createSplitAction = createSplitAction;
/**
 * Type guard for SplitAction
 */
function isSplitAction(action) {
    return action.actionType === ActionType_1.ActionType.SPLIT;
}
exports.isSplitAction = isSplitAction;
