import {
    EditorClient,
    Modal,
    JsonSerializable
} from 'lucid-extension-sdk';
import {
    EnvelopeBase,
    isEnvelope,
    MessageSource
} from '@quodsi/lucid-shared';
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
        // Fixed-size or fullscreen — the SDK's ModalConfig treats these as a
        // mutually exclusive union, so subclasses pass one shape or the other.
        options: { title: string; url: string } &
            ({ width: number; height: number } | { fullScreen: true }),
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
     *
     * Reopen ordering race: a channel's panel (set here, on frameLoaded) and
     * its ready flag (set on REACT_APP_READY) can arrive in either order, but
     * the queue is only flushed on the REACT_APP_READY path. On a warm reopen
     * the embedded Studio iframe loads from cache and completes its token
     * round-trip — host relays STUDIO_TOKEN — *before* Lucid fires this
     * frameLoaded, while REACT_APP_READY was processed earlier (its flush
     * bailed because the panel wasn't registered yet). The reply is left
     * stranded in the queue and the embed shows "Couldn't load the results
     * viewer …" after the 10s timeout. Now that the panel is registered, drain
     * the queue if the channel is already ready so the late panel still
     * delivers any reply queued before it arrived.
     */
    protected frameLoaded(): void {
        super.frameLoaded();
        this.debug.log(`frameLoaded - registering with router as "${this.channelRole}" channel`);
        router.registerChannel(this.channelRole, this);

        const channelManager = router.getChannelManager();
        if (channelManager.isChannelReady(this.channelRole)) {
            this.debug.log(
                `frameLoaded - ${this.channelRole} channel already ready; flushing queued messages`
            );
            channelManager.flushQueue(this.channelRole);
        }
    }

    /**
     * Called when the modal iframe is closed.
     * Resets the channel so the next modal gets a clean slate.
     *
     * Identity guard: only tear down the channel if WE still own it. The
     * 'studio-embed' (and 'results') channel is a shared singleton on the
     * router, and Lucid fires frameClosed asynchronously off iframe unload —
     * it can be deferred. On a close-then-reopen, this modal's late frameClosed
     * could otherwise clobber the *next* modal's already-registered, already-
     * ready channel (ready=false, panel=undefined, queue cleared), stranding
     * the host's STUDIO_TOKEN reply on a dead channel with no further
     * REACT_APP_READY to flush it — the token never reaches the iframe and the
     * embed shows "Couldn't load the results viewer …" after the 10s timeout.
     * Skipping the wipe when another modal has taken over avoids that race.
     */
    protected frameClosed(): void {
        this.debug.log(`frameClosed - cleaning up ${this.channelRole} channel`);
        const channelManager = router.getChannelManager();
        const channel = channelManager.getChannel(this.channelRole);
        if (channel && channel.panel === this) {
            channel.ready = false;
            channel.panel = undefined;
            channel.queue.length = 0;
            // Drop ourselves from the recovery cache too, so a later send()
            // can't resurrect this now-closed modal as the channel's panel.
            router.clearFromGlobalRegistry(this.channelRole);
        } else if (channel) {
            this.debug.log(
                `frameClosed - ${this.channelRole} channel already owned by another modal; skipping teardown`
            );
        }
        super.frameClosed();
    }
}
