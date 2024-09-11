"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDataConnector = void 0;
const lucid_extension_sdk_1 = require("lucid-extension-sdk");
const simulateaction_1 = require("./actions/simulateaction");
const makeDataConnector = (client) => new lucid_extension_sdk_1.DataConnector(client)
    .defineAsynchronousAction("Simulate", simulateaction_1.simulateAction);
exports.makeDataConnector = makeDataConnector;
