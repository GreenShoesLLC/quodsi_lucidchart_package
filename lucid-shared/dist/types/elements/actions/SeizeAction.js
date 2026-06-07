"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSeizeAction = exports.createSeizeAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a SeizeAction
 */
function createSeizeAction(resourceRequirementId, stateCondition, id) {
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.SEIZE,
        resourceRequirementId: resourceRequirementId,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createSeizeAction = createSeizeAction;
/**
 * Type guard for SeizeAction
 */
function isSeizeAction(action) {
    return action.actionType === ActionType_1.ActionType.SEIZE;
}
exports.isSeizeAction = isSeizeAction;
