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
 * Spike 0/1: a modal whose packaged HTML hosts a nested cross-origin Studio
 * iframe. Modeled on ResultsModal. Registers on the 'studio-embed-spike'
 * channel so a future token-relay handler can reach the React view.
 */
export class StudioEmbedSpikeModal extends Modal implements RoutablePanel {
    private debug = ExtensionDebugService.forComponent('StudioEmbedSpikeModal');

    constructor(client: EditorClient) {
        const studioOrigin = getStudioBaseUrl() ?? 'https://dev-studio.quodsi.com';
        const modalUrl = `quodsim-react/index.html?view=studio-embed-spike&studioOrigin=${encodeURIComponent(studioOrigin)}`;
        super(client, {
            title: 'Studio Embed Spike',
            url: modalUrl,
            width: 1000,
            height: 700,
        });
        this.debug.log('Constructed');
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
            this.debug.error('relayToIframe error', {
                err: err instanceof Error ? err.message : String(err),
                type: msg.type
            });
        }
    }

    /**
     * Process messages from the modal iframe.
     * Route them through the router with source set to 'studio-embed-spike-iframe'.
     */
    protected messageFromFrame(message: unknown): void {
        if (!isEnvelope(message)) {
            this.debug.error('Invalid message format:', message);
            return;
        }

        const envelope = message as EnvelopeBase;
        envelope.source = 'studio-embed-spike-iframe';
        envelope.target = 'host';

        this.debug.debug('Forwarding message to router:', envelope.type);
        router.receive(envelope);
    }

    /**
     * Called when the modal iframe has loaded.
     * Register with the router as the 'studio-embed-spike' channel.
     */
    protected frameLoaded(): void {
        super.frameLoaded();
        this.debug.log('frameLoaded - registering with router as "studio-embed-spike" channel');
        router.registerChannel('studio-embed-spike', this);
    }

    /**
     * Called when the modal iframe is closed/removed.
     * Reset the studio-embed-spike channel so it doesn't hold stale references.
     */
    protected frameClosed(): void {
        this.debug.log('frameClosed - cleaning up studio-embed-spike channel');
        const channelManager = router.getChannelManager();
        const channel = channelManager.getChannel('studio-embed-spike');
        if (channel) {
            channel.ready = false;
            channel.panel = undefined;
            channel.queue.length = 0;
        }
        super.frameClosed();
    }
}
