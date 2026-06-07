"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDelayWithResourceAction = exports.createDelayWithResourceAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a DelayWithResourceAction
 */
function createDelayWithResourceAction(duration, options, id) {
    var _a, _b, _c, _d;
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.DELAY_WITH_RESOURCE,
        duration: duration,
        resourceRequirementId: (_a = options === null || options === void 0 ? void 0 : options.resourceRequirementId) !== null && _a !== void 0 ? _a : null,
        keepResource: (_b = options === null || options === void 0 ? void 0 : options.keepResource) !== null && _b !== void 0 ? _b : false,
        stateModifications: (_c = options === null || options === void 0 ? void 0 : options.stateModifications) !== null && _c !== void 0 ? _c : [],
        stateCondition: (_d = options === null || options === void 0 ? void 0 : options.stateCondition) !== null && _d !== void 0 ? _d : null
    };
}
exports.createDelayWithResourceAction = createDelayWithResourceAction;
/**
 * Type guard for DelayWithResourceAction
 */
function isDelayWithResourceAction(action) {
    return action.actionType === ActionType_1.ActionType.DELAY_WITH_RESOURCE;
}
exports.isDelayWithResourceAction = isDelayWithResourceAction;
