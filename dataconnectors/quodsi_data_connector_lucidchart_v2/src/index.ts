import { app } from '@azure/functions';

// Import all function files so their app.http() registrations execute
import './functions/dataConnectorHttpTrigger';
import './functions/getDocumentStatus';
import './functions/httpTrigger1';
import './functions/markResultsViewed';
import './functions/saveAndSubmitSimulation';
import './functions/submitSimulationJob';
import './functions/uploadModelDefinition';

app.setup({
    enableHttpStream: true,
});
