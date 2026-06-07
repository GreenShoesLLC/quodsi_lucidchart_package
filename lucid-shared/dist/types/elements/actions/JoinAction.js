"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJoinAction = exports.createJoinAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a JoinAction with default values.
 *
 * @param options Optional configuration for the join action
 */
function createJoinAction(options, id) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.JOIN,
        matchState: (_a = options === null || options === void 0 ? void 0 : options.matchState) !== null && _a !== void 0 ? _a : null,
        joinCount: (_b = options === null || options === void 0 ? void 0 : options.joinCount) !== null && _b !== void 0 ? _b : 2,
        combinedTemplateId: (_c = options === null || options === void 0 ? void 0 : options.combinedTemplateId) !== null && _c !== void 0 ? _c : null,
        destinationId: (_d = options === null || options === void 0 ? void 0 : options.destinationId) !== null && _d !== void 0 ? _d : null,
        inheritStates: (_e = options === null || options === void 0 ? void 0 : options.inheritStates) !== null && _e !== void 0 ? _e : [],
        modifications: (_f = options === null || options === void 0 ? void 0 : options.modifications) !== null && _f !== void 0 ? _f : [],
        joinCountState: (_g = options === null || options === void 0 ? void 0 : options.joinCountState) !== null && _g !== void 0 ? _g : null,
        stateCondition: (_h = options === null || options === void 0 ? void 0 : options.stateCondition) !== null && _h !== void 0 ? _h : null
    };
}
exports.createJoinAction = createJoinAction;
/**
 * Type guard for JoinAction
 */
function isJoinAction(action) {
    return action.actionType === ActionType_1.ActionType.JOIN;
}
exports.isJoinAction = isJoinAction;
