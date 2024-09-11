import * as crypto from 'crypto';
import * as express from 'express';
import { DataConnectorClient } from 'lucid-extension-sdk';
import { makeDataConnector } from './index';

const dataConnector = makeDataConnector(new DataConnectorClient({ crypto, Buffer }));

// Get the port from the environment variable or use a default port (9900)
const port = process.env.PORT ? parseInt(process.env.PORT) : 9902;

// Run the debug server with the specified port
dataConnector.runDebugServer({
    express,
    port, // pass the port here
});
