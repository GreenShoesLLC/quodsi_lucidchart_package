"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDelayAction = exports.createDelayAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a DelayAction
 */
function createDelayAction(duration, stateCondition, id) {
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.DELAY,
        duration: duration,
        stateCondition: stateCondition !== null && stateCondition !== void 0 ? stateCondition : null
    };
}
exports.createDelayAction = createDelayAction;
/**
 * Type guard for DelayAction
 */
function isDelayAction(action) {
    return action.actionType === ActionType_1.ActionType.DELAY;
}
exports.isDelayAction = isDelayAction;
