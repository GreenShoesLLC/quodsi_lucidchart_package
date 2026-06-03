import { EditorClient } from 'lucid-extension-sdk';
import { RoutingModal } from './RoutingModal';
import { ExtensionDebugService } from '../core/logging/ExtensionDebugService';

/**
 * ResultsModal displays the SimulationRunAnalysisDashboard in a large modal dialog,
 * providing more screen real estate than the 300px right dock panel.
 *
 * Routing behaviour (relayToIframe / messageFromFrame / frameLoaded /
 * frameClosed) is inherited from RoutingModal with channel role 'results'.
 */
export class ResultsModal extends RoutingModal {
    protected debug = ExtensionDebugService.forComponent('ResultsModal');

    constructor(client: EditorClient, scenarioId: string, documentId: string) {
        super(
            client,
            {
                title: 'Simulation Results',
                url: `quodsim-react/index.html?view=results&scenarioId=${encodeURIComponent(scenarioId)}&documentId=${encodeURIComponent(documentId)}`,
                width: 1000,
                height: 700,
            },
            'results'
        );
        this.debug.log('Constructed for scenario:', scenarioId);
    }
}
