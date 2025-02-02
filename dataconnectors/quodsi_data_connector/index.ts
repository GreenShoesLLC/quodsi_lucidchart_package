import { DataConnector, DataConnectorClient } from 'lucid-extension-sdk';
import { simulateAction } from './actions/simulateaction';
import { getActivityUtilizationAction } from './actions/getactivityutilizationaction'
import { importSimulationResultsAction } from './actions/importSimulationResultsAction';
import { pollAction } from './actions/pollAction';
import { patchAction } from './actions/patchAction';
import { hardRefreshAction } from './actions/hardRefreshAction';


export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
        .defineAsynchronousAction("GetActivityUtilization", getActivityUtilizationAction)
        .defineAsynchronousAction("Simulate", simulateAction)
        .defineAsynchronousAction("ImportSimulationResults", importSimulationResultsAction)
        .defineAsynchronousAction("Poll", pollAction)
        .defineAction("Patch", patchAction)
        .defineAsynchronousAction("HardRefresh", hardRefreshAction);

