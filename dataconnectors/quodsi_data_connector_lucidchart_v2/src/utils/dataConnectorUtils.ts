import { DataConnector, DataConnectorClient } from 'lucid-extension-sdk';
import * as crypto from 'crypto';

import { simulateAction } from '../actions/simulateAction';
import { getActivityUtilizationAction } from '../actions/getActivityUtilizationAction';
import { pollAction } from '../actions/pollAction';
import { patchAction } from '../actions/patchAction';
import { hardRefreshAction } from '../actions/hardRefreshAction';
import { importSimulationResultsAction } from '../actions/importSimulationResultsAction';
import { saveAndSubmitSimulationAction } from '../actions/saveAndSubmitSimulationAction';
import { uploadModelDefinitionAction } from '../actions/uploadModelDefinitionAction';
import { submitSimulationJobAction } from '../actions/submitSimulationJobAction';

export const createDataConnector = () => {
    const client = new DataConnectorClient({ crypto, Buffer });
    return new DataConnector(client)
        .defineAsynchronousAction("Simulate", simulateAction)
        .defineAsynchronousAction("GetActivityUtilization", getActivityUtilizationAction)
        .defineAsynchronousAction("Poll", pollAction)
        .defineAction("Patch", patchAction)
        .defineAsynchronousAction("HardRefresh", hardRefreshAction)
        .defineAsynchronousAction("ImportSimulationResults", importSimulationResultsAction)
        .defineAsynchronousAction("SaveAndSubmitSimulation", saveAndSubmitSimulationAction)
        .defineAsynchronousAction("UploadModelDefinition", uploadModelDefinitionAction)
        .defineAsynchronousAction("SubmitSimulationJob", submitSimulationJobAction);
};

export const validateLucidRequest = async (headers: Record<string, string | string[]>, body: any) => {
    // We'll implement proper validation later
    return true;
};