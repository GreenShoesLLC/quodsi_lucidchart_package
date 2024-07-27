import { DataConnector, DataConnectorClient } from 'lucid-extension-sdk';
import { simulateAction } from './actions/simulateaction';


export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
        .defineAsynchronousAction("Simulate", simulateAction);
