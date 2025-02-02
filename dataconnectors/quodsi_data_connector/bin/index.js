"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDataConnector = void 0;
const lucid_extension_sdk_1 = require("lucid-extension-sdk");
const simulateaction_1 = require("./actions/simulateaction");
const getactivityutilizationaction_1 = require("./actions/getactivityutilizationaction");
const importSimulationResultsAction_1 = require("./actions/importSimulationResultsAction");
const pollAction_1 = require("./actions/pollAction");
const patchAction_1 = require("./actions/patchAction");
const hardRefreshAction_1 = require("./actions/hardRefreshAction");
const makeDataConnector = (client) => new lucid_extension_sdk_1.DataConnector(client)
    .defineAsynchronousAction("GetActivityUtilization", getactivityutilizationaction_1.getActivityUtilizationAction)
    .defineAsynchronousAction("Simulate", simulateaction_1.simulateAction)
    .defineAsynchronousAction("ImportSimulationResults", importSimulationResultsAction_1.importSimulationResultsAction)
    .defineAsynchronousAction("Poll", pollAction_1.pollAction)
    .defineAction("Patch", patchAction_1.patchAction)
    .defineAsynchronousAction("HardRefresh", hardRefreshAction_1.hardRefreshAction);
exports.makeDataConnector = makeDataConnector;
