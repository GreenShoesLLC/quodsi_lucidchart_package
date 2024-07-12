import {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';

export const makeDataConnector = (client: DataConnectorClient) => new DataConnector(client);
