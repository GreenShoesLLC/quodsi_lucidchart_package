import {
    EditorClient,
    Modal,
    JsonSerializable
} from 'lucid-extension-sdk';
import {
    EnvelopeBase,
    isEnvelope,
    MessageSource
} from '@quodsi/shared';
import { router, RoutablePanel, PanelRole } from '../core/messaging';
import { ExtensionDebugService } from '../core/logging/ExtensionDebugService';

/**
 * Abstract base class for routing modals.
 *
 * Provides the four RoutablePanel lifecycle methods (relayToIframe,
 * messageFromFrame, frameLoaded, frameClosed) that are identical across
 * ResultsModal and StudioEmbedModal, differing only by their channel role
 * and the derived iframe-source string.
 *
 * Subclasses supply the role via the constructor and are free to add their
 * own logic on top; they must NOT re-implement the four methods below.
 */
export abstract class RoutingModal extends Modal implements RoutablePanel {
    protected debug = ExtensionDebugService.forComponent('RoutingModal');

    /**
     * @param client      Lucid EditorClient
     * @param options     Passed straight through to Modal's constructor
     * @param channelRole The PanelRole this modal owns ('results' | 'studio-embed')
     */
    protected constructor(
        client: EditorClient,
        options: { title: string; url: string; width: number; height: number },
        private readonly channelRole: PanelRole
    ) {
        super(client, options);
    }

    // ------------------------------------------------------------------ //
    //  RoutablePanel — shared implementations                              //
    // ------------------------------------------------------------------ //

    /**
     * Relay a message from the host to this modal's iframe.
     * Implementation of the RoutablePanel interface.
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
     * Process messages coming from the modal iframe and forward to the router.
     * Sets source = '<role>-iframe' and target = 'host' before routing.
     */
    protected messageFromFrame(message: unknown): void {
        if (!isEnvelope(message)) {
            this.debug.error('Invalid message format:', message);
            return;
        }

        const envelope = message as EnvelopeBase;
        // The template literal `${PanelRole}-iframe` always resolves to a
        // valid MessageSource value ('results-iframe' | 'studio-embed-iframe'
        // | 'model-iframe'). The cast is localised here to keep the assignment
        // type-safe while satisfying the strict MessageSource union.
        envelope.source = `${this.channelRole}-iframe` as MessageSource;
        envelope.target = 'host';

        this.debug.debug('Forwarding message to router:', envelope.type);
        router.receive(envelope);
    }

    /**
     * Called when the iframe finishes loading.
     * Registers this modal as the handler for its channel role.
     */
    protected frameLoaded(): void {
        super.frameLoaded();
        this.debug.log(`frameLoaded - registering with router as "${this.channelRole}" channel`);
        router.registerChannel(this.channelRole, this);
    }

    /**
     * Called when the modal iframe is closed.
     * Resets the channel so the next modal gets a clean slate.
     */
    protected frameClosed(): void {
        this.debug.log(`frameClosed - cleaning up ${this.channelRole} channel`);
        const channelManager = router.getChannelManager();
        const channel = channelManager.getChannel(this.channelRole);
        if (channel) {
            channel.ready = false;
            channel.panel = undefined;
            channel.queue.length = 0;
        }
        super.frameClosed();
    }
}
