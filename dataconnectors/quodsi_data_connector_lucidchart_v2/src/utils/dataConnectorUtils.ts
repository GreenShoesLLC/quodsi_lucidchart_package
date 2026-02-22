import { DataConnector, DataConnectorClient } from 'lucid-extension-sdk';
import * as crypto from 'crypto';

import { simulateAction } from '../actions/simulateAction';
import { pollAction } from '../actions/pollAction';
import { patchAction } from '../actions/patchAction';
import { hardRefreshAction } from '../actions/hardRefreshAction';
import { importSimulationResultsAction } from '../actions/importSimulationResultsAction';
import { saveAndSubmitSimulationAction } from '../actions/saveAndSubmitSimulationAction';
import { uploadModelDefinitionAction } from '../actions/uploadModelDefinitionAction';
import { submitSimulationJobAction } from '../actions/submitSimulationJobAction';
import { markResultsViewedAction } from '../actions/markResultsViewedAction';
import { getDocumentStatusAction } from '../actions/getDocumentStatusAction';
import { listSimulationRunsAction } from '../actions/listSimulationRunsAction';
import { deleteSimulationRunAction } from '../actions/deleteSimulationRunAction';
import { getTaskStatusAction } from '../actions/getTaskStatusAction';
import { checkSimulationRunTaskStatusAction } from '../actions/checkSimulationRunTaskStatusAction';
import { getActivityCrossRepDataAction } from '../actions/getActivityCrossRepDataAction';
import { getEntityCrossRepDataAction } from '../actions/getEntityCrossRepDataAction';
import { getResourceCrossRepDataAction } from '../actions/getResourceCrossRepDataAction';
import { getSimulationRunCrossRepDataAction } from '../actions/getSimulationRunCrossRepDataAction';
import { getActivityContentsTimeseriesAction } from '../actions/getActivityContentsTimeseriesAction';
import { getActivityInboundQueueTimeseriesAction } from '../actions/getActivityInboundQueueTimeseriesAction';
import { getActivityOutboundQueueTimeseriesAction } from '../actions/getActivityOutboundQueueTimeseriesAction';
import { getStateSummaryAction } from '../actions/getStateSummaryAction';
import { getStateValuesTimeseriesAction } from '../actions/getStateValuesTimeseriesAction';
import { getEntityThroughputTimeseriesAction } from '../actions/getEntityThroughputTimeseriesAction';
import { getActivityEntitySummaryAction } from '../actions/getActivityEntitySummaryAction';


export const createDataConnector = () => {
    const client = new DataConnectorClient({ crypto, Buffer });
    const connector = new DataConnector(client)
        .defineAsynchronousAction("Simulate", simulateAction)
        .defineAsynchronousAction("Poll", pollAction)
        .defineAction("Patch", patchAction)
        .defineAsynchronousAction("HardRefresh", hardRefreshAction)
        .defineAsynchronousAction("ImportSimulationResults", importSimulationResultsAction)
        .defineAsynchronousAction("SaveAndSubmitSimulation", saveAndSubmitSimulationAction)
        .defineAsynchronousAction("MarkResultsViewed", markResultsViewedAction)
        .defineAsynchronousAction("UploadModelDefinition", uploadModelDefinitionAction)
        .defineAsynchronousAction("SubmitSimulationJob", submitSimulationJobAction)
        .defineAsynchronousAction("GetDocumentStatus", getDocumentStatusAction)
        .defineAsynchronousAction("ListScenarios", listSimulationRunsAction)
        .defineAsynchronousAction("DeleteScenario", deleteSimulationRunAction)
        .defineAsynchronousAction("GetTaskStatus", getTaskStatusAction)
        .defineAsynchronousAction("CheckScenarioTaskStatus", checkSimulationRunTaskStatusAction)
        .defineAsynchronousAction("GetActivityCrossRepData", getActivityCrossRepDataAction)
        .defineAsynchronousAction("GetEntityCrossRepData", getEntityCrossRepDataAction)
        .defineAsynchronousAction("GetResourceCrossRepData", getResourceCrossRepDataAction)
        .defineAsynchronousAction("GetScenarioCrossRepData", getSimulationRunCrossRepDataAction)
        .defineAsynchronousAction("GetActivityContentsTimeseries", getActivityContentsTimeseriesAction)
        .defineAsynchronousAction("GetActivityInboundQueueTimeseries", getActivityInboundQueueTimeseriesAction)
        .defineAsynchronousAction("GetActivityOutboundQueueTimeseries", getActivityOutboundQueueTimeseriesAction)
        .defineAsynchronousAction("GetStateSummary", getStateSummaryAction)
        .defineAsynchronousAction("GetStateValuesTimeseries", getStateValuesTimeseriesAction)
        .defineAsynchronousAction("GetEntityThroughputTimeseries", getEntityThroughputTimeseriesAction)
        .defineAsynchronousAction("GetActivityEntitySummary", getActivityEntitySummaryAction);

    return connector;
};

export const validateLucidRequest = async (headers: Record<string, string | string[]>, body: any) => {
    // We'll implement proper validation later
    return true;
};