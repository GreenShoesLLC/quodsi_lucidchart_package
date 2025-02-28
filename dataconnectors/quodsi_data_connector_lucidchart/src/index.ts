import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});

import './functions/dataConnectorHttpTrigger';
import './functions/getDocumentStatus';
import './functions/httpTrigger1';
import './functions/saveAndSubmitSimulation';
import './functions/submitSimulationJob';
import './functions/uploadModelDefinition'