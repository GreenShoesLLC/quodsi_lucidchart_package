"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReleaseAction = exports.createReleaseAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a ReleaseAction
 */
function createReleaseAction(resourceRequirementId, stateCondition, id) {
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.RELEASE,
        resourceRequirementId: resourceRequirementId,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createReleaseAction = createReleaseAction;
/**
 * Type guard for ReleaseAction
 */
function isReleaseAction(action) {
    return action.actionType === ActionType_1.ActionType.RELEASE;
}
exports.isReleaseAction = isReleaseAction;
