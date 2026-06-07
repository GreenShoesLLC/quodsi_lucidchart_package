"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCreateAction = exports.createCreateAction = void 0;
var ActionType_1 = require("./ActionType");
var uuidUtils_1 = require("../../../utils/uuidUtils");
/**
 * Creates a CreateAction with default values.
 *
 * @param options Optional configuration for the create action
 */
function createCreateAction(options, id) {
    var _a, _b, _c, _d, _e;
    return {
        id: id !== null && id !== void 0 ? id : (0, uuidUtils_1.generateUUID)(),
        actionType: ActionType_1.ActionType.CREATE,
        entityTemplateId: (_a = options === null || options === void 0 ? void 0 : options.entityTemplateId) !== null && _a !== void 0 ? _a : null,
        destinationId: (_b = options === null || options === void 0 ? void 0 : options.destinationId) !== null && _b !== void 0 ? _b : null,
        inheritStates: (_c = options === null || options === void 0 ? void 0 : options.inheritStates) !== null && _c !== void 0 ? _c : [],
        modifications: (_d = options === null || options === void 0 ? void 0 : options.modifications) !== null && _d !== void 0 ? _d : [],
        stateCondition: (_e = options === null || options === void 0 ? void 0 : options.stateCondition) !== null && _e !== void 0 ? _e : null
    };
}
exports.createCreateAction = createCreateAction;
/**
 * Type guard for CreateAction
 */
function isCreateAction(action) {
    return action.actionType === ActionType_1.ActionType.CREATE;
}
exports.isCreateAction = isCreateAction;
