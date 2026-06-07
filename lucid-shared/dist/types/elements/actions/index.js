"use strict";
// Action system exports
// This module provides the Action types that replace the legacy OperationStep system
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultAction = void 0;
__exportStar(require("./ActionType"), exports);
__exportStar(require("./Action"), exports);
__exportStar(require("./AssignAction"), exports);
__exportStar(require("./SeizeAction"), exports);
__exportStar(require("./ReleaseAction"), exports);
__exportStar(require("./DelayAction"), exports);
__exportStar(require("./DelayWithResourceAction"), exports);
__exportStar(require("./SplitAction"), exports);
__exportStar(require("./CreateAction"), exports);
__exportStar(require("./DisposeAction"), exports);
__exportStar(require("./JoinAction"), exports);
__exportStar(require("./LoopAction"), exports);
__exportStar(require("./BranchAction"), exports);
// Re-export factory functions for convenience
var ActionType_1 = require("./ActionType");
var AssignAction_1 = require("./AssignAction");
var SeizeAction_1 = require("./SeizeAction");
var ReleaseAction_1 = require("./ReleaseAction");
var DelayAction_1 = require("./DelayAction");
var DelayWithResourceAction_1 = require("./DelayWithResourceAction");
var SplitAction_1 = require("./SplitAction");
var CreateAction_1 = require("./CreateAction");
var DisposeAction_1 = require("./DisposeAction");
var JoinAction_1 = require("./JoinAction");
var LoopAction_1 = require("./LoopAction");
var BranchAction_1 = require("./BranchAction");
var Duration_1 = require("../Duration");
/**
 * Create a default action based on action type.
 */
function createDefaultAction(actionType) {
    switch (actionType) {
        case ActionType_1.ActionType.ASSIGN:
            return (0, AssignAction_1.createAssignAction)([]);
        case ActionType_1.ActionType.SEIZE:
            return (0, SeizeAction_1.createSeizeAction)("");
        case ActionType_1.ActionType.RELEASE:
            return (0, ReleaseAction_1.createReleaseAction)("");
        case ActionType_1.ActionType.DELAY:
            return (0, DelayAction_1.createDelayAction)(new Duration_1.Duration());
        case ActionType_1.ActionType.DELAY_WITH_RESOURCE:
            return (0, DelayWithResourceAction_1.createDelayWithResourceAction)(new Duration_1.Duration());
        case ActionType_1.ActionType.SPLIT:
            return (0, SplitAction_1.createSplitAction)(1);
        case ActionType_1.ActionType.CREATE:
            return (0, CreateAction_1.createCreateAction)();
        case ActionType_1.ActionType.DISPOSE:
            return (0, DisposeAction_1.createDisposeAction)();
        case ActionType_1.ActionType.JOIN:
            return (0, JoinAction_1.createJoinAction)();
        case ActionType_1.ActionType.LOOP:
            return (0, LoopAction_1.createLoopAction)();
        case ActionType_1.ActionType.BRANCH:
            return (0, BranchAction_1.createBranchAction)();
        default:
            throw new Error("Unknown action type: ".concat(actionType));
    }
}
exports.createDefaultAction = createDefaultAction;
