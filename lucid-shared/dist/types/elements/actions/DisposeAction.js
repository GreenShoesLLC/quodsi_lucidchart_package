"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDisposeAction = exports.createDisposeAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a DisposeAction.
 *
 * DisposeAction has no parameters - it simply terminates the entity.
 */
function createDisposeAction(stateCondition, id) {
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.DISPOSE,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createDisposeAction = createDisposeAction;
/**
 * Type guard for DisposeAction
 */
function isDisposeAction(action) {
    return action.actionType === ActionType_1.ActionType.DISPOSE;
}
exports.isDisposeAction = isDisposeAction;
