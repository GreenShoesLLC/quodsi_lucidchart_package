"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignAction = exports.createAssignAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates an AssignAction
 */
function createAssignAction(modifications, stateCondition, id) {
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.ASSIGN,
        modifications: modifications,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createAssignAction = createAssignAction;
/**
 * Type guard for AssignAction
 */
function isAssignAction(action) {
    return action.actionType === ActionType_1.ActionType.ASSIGN;
}
exports.isAssignAction = isAssignAction;
