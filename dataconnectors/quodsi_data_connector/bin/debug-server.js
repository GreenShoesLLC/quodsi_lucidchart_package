"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const express = require("express");
const lucid_extension_sdk_1 = require("lucid-extension-sdk");
const index_1 = require("./index");
const dataConnector = (0, index_1.makeDataConnector)(new lucid_extension_sdk_1.DataConnectorClient({ crypto, Buffer }));
// Get the port from the environment variable or use a default port (9900)
const port = process.env.PORT ? parseInt(process.env.PORT) : 9902;
// Run the debug server with the specified port
dataConnector.runDebugServer({
    express,
    port, // pass the port here
});
