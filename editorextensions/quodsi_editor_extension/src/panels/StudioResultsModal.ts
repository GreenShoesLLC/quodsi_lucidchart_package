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
import { getStudioBaseUrl } from '../core/messaging/handlers/authHandler';

/**
 * Modal that embeds Studio's read-only results viewer for one scenario.
 * Hosts quodsim-react's ?view=studio-results, which renders EmbeddedStudioFrame
 * pointed at Studio's /embed/scenarios/:scenarioId/results. Registers the
 * 'studio-results' channel for the token relay.
 */
export class StudioResultsModal extends Modal implements RoutablePanel {
    private debug = ExtensionDebugService.forComponent('StudioResultsModal');

    constructor(client: EditorClient, scenarioId: string) {
        const studioOrigin = getStudioBaseUrl() ?? 'https://dev-studio.quodsi.com';
        const url =
            `quodsim-react/index.html?view=studio-results` +
            `&scenarioId=${encodeURIComponent(scenarioId)}` +
            `&studioOrigin=${encodeURIComponent(studioOrigin)}`;
        super(client, { title: 'Simulation Results', url, width: 1000, height: 700 });
    }

    /**
     * Implementation of RoutablePanel interface.
     * Sends a message to the modal iframe.
     */
    public relayToIframe(msg: EnvelopeBase): void {
        try {
            this.sendMessage(msg as unknown as JsonSerializable);
        } catch (err) {
            this.debug.error('relayToIframe error', {
                err: err instanceof Error ? err.message : String(err),
                type: msg.type
            });
        }
    }

    /**
     * Process messages from the modal iframe.
     * Route them through the router with source set to 'studio-results-iframe'.
     */
    protected messageFromFrame(message: unknown): void {
        if (!isEnvelope(message)) {
            this.debug.error('Invalid message format:', message);
            return;
        }

        const envelope = message as EnvelopeBase;
        envelope.source = 'studio-results-iframe';
        envelope.target = 'host';

        router.receive(envelope);
    }

    /**
     * Called when the modal iframe has loaded.
     * Register with the router as the 'studio-results' channel.
     */
    protected frameLoaded(): void {
        super.frameLoaded();
        router.registerChannel('studio-results', this);
    }

    /**
     * Called when the modal iframe is closed/removed.
     * Reset the studio-results channel so it doesn't hold stale references.
     */
    protected frameClosed(): void {
        const channelManager = router.getChannelManager();
        const channel = channelManager.getChannel('studio-results');
        if (channel) {
            channel.ready = false;
            channel.panel = undefined;
            channel.queue.length = 0;
        }
        super.frameClosed();
    }
}
