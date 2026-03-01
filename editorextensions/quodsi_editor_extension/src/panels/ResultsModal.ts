import {
    EditorClient,
    Modal,
    JsonSerializable
} from 'lucid-extension-sdk';
import {
    EnvelopeBase,
    isEnvelope
} from '@quodsi/shared';
import { router, RoutablePanel } from '../core/messaging';
import { ExtensionDebugService } from '../core/logging/ExtensionDebugService';

/**
 * ResultsModal displays the SimulationRunAnalysisDashboard in a large modal dialog,
 * providing more screen real estate than the 300px right dock panel.
 */
export class ResultsModal extends Modal implements RoutablePanel {
    private debug = ExtensionDebugService.forComponent('ResultsModal');

    constructor(client: EditorClient, scenarioId: string, documentId: string) {
        super(client, {
            title: 'Simulation Results',
            url: `quodsim-react/index.html?view=results&scenarioId=${encodeURIComponent(scenarioId)}&documentId=${encodeURIComponent(documentId)}`,
            width: 1000,
            height: 700,
        });
        this.debug.log('Constructed for scenario:', scenarioId);
    }

    /**
     * Implementation of RoutablePanel interface.
     * Sends a message to the modal iframe.
     */
    public relayToIframe(msg: EnvelopeBase): void {
        this.debug.log(`relayToIframe called with msg type: ${msg.type}`);
        try {
            this.sendMessage(msg as unknown as JsonSerializable);
        } catch (err) {
            this.debug.error('Error in sendMessage:', {
                error: err instanceof Error ? err.message : String(err),
                msgType: msg.type
            });
        }
    }

    /**
     * Process messages from the modal iframe.
     * Route them through the router with source set to 'results-iframe'.
     */
    protected messageFromFrame(message: unknown): void {
        if (!isEnvelope(message)) {
            this.debug.error('Invalid message format:', message);
            return;
        }

        const envelope = message as EnvelopeBase;
        envelope.source = 'results-iframe';
        envelope.target = 'host';

        this.debug.debug('Forwarding message to router:', envelope.type);
        router.receive(envelope);
    }

    /**
     * Called when the modal iframe has loaded.
     * Register with the router as the 'results' channel.
     */
    protected frameLoaded(): void {
        super.frameLoaded();
        this.debug.log('frameLoaded - registering with router as "results" channel');
        router.registerChannel('results', this);
    }

    /**
     * Called when the modal iframe is closed/removed.
     * Reset the results channel so it doesn't hold stale references.
     */
    protected frameClosed(): void {
        this.debug.log('frameClosed - cleaning up results channel');
        // Reset the channel readiness so a future modal gets a fresh channel
        const channelManager = router.getChannelManager();
        const channel = channelManager.getChannel('results');
        if (channel) {
            channel.ready = false;
            channel.panel = undefined;
            channel.queue.length = 0;
        }
        super.frameClosed();
    }
}
