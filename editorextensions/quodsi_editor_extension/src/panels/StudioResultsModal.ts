import { EditorClient } from 'lucid-extension-sdk';
import { RoutingModal } from './RoutingModal';
import { getStudioBaseUrl } from '../core/messaging/handlers/authHandler';

/**
 * Modal that embeds Studio's read-only results viewer for one scenario.
 * Hosts quodsim-react's ?view=studio-results, which renders EmbeddedStudioFrame
 * pointed at Studio's /embed/scenarios/:scenarioId/results. Registers the
 * 'studio-results' channel for the token relay.
 *
 * Routing behaviour (relayToIframe / messageFromFrame / frameLoaded /
 * frameClosed) is inherited from RoutingModal with channel role 'studio-results'.
 */
export class StudioResultsModal extends RoutingModal {
    constructor(client: EditorClient, scenarioId: string) {
        const studioOrigin = getStudioBaseUrl() ?? 'https://dev-studio.quodsi.com';
        const url =
            `quodsim-react/index.html?view=studio-results` +
            `&scenarioId=${encodeURIComponent(scenarioId)}` +
            `&studioOrigin=${encodeURIComponent(studioOrigin)}`;
        super(client, { title: 'Simulation Results', url, width: 1000, height: 700 }, 'studio-results');
    }
}
