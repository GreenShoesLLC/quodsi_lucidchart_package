"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoopAction = exports.createLoopAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a LoopAction with default values.
 *
 * @param count Number of iterations (default: 1)
 * @param actions Optional list of actions to repeat
 */
function createLoopAction(count, actions, stateCondition, id) {
    if (count === void 0) { count = 1; }
    if (actions === void 0) { actions = []; }
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.LOOP,
        count: count,
        actions: actions,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createLoopAction = createLoopAction;
/**
 * Type guard for LoopAction
 */
function isLoopAction(action) {
    return action.actionType === ActionType_1.ActionType.LOOP;
}
exports.isLoopAction = isLoopAction;
