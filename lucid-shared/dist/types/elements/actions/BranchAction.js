"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBranchAction = exports.createBranchAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a BranchAction with default values.
 *
 * @param options Optional configuration for the branch action
 */
function createBranchAction(options, id) {
    var _a, _b, _c, _d;
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.BRANCH,
        condition: (_a = options === null || options === void 0 ? void 0 : options.condition) !== null && _a !== void 0 ? _a : null,
        ifTrue: (_b = options === null || options === void 0 ? void 0 : options.ifTrue) !== null && _b !== void 0 ? _b : [],
        ifFalse: (_c = options === null || options === void 0 ? void 0 : options.ifFalse) !== null && _c !== void 0 ? _c : [],
        stateCondition: (_d = options === null || options === void 0 ? void 0 : options.stateCondition) !== null && _d !== void 0 ? _d : null
    };
}
exports.createBranchAction = createBranchAction;
/**
 * Type guard for BranchAction
 */
function isBranchAction(action) {
    return action.actionType === ActionType_1.ActionType.BRANCH;
}
exports.isBranchAction = isBranchAction;
