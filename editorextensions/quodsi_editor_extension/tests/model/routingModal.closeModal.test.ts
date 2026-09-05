// tests/model/routingModal.closeModal.test.ts
//
// Covers RoutingModal.messageFromFrame's CLOSE_MODAL intercept -- the seam a
// chromeless-turned-titled modal's in-view close button (ScheduleModal's own
// X, ScheduleEditorView.tsx) still relies on as its second exit. Nothing
// exercised this seam before: tests/__mocks__/lucid-extension-sdk.ts's Modal
// had show()/frameLoaded()/frameClosed() but no hide() and no `visible`, so
// a CLOSE_MODAL envelope reaching messageFromFrame would have thrown
// "this.hide is not a function" here, and in production would have silently
// hit the real SDK's Modal.hide() -- a no-op unless `visible` is true.
//
// Uses ScheduleEditorModal (not a bare RoutingModal subclass) as the
// concrete instance under test, the same way scheduleEditorModal.test.ts
// does -- RoutingModal itself is abstract. Same core/messaging/index mocking
// posture as that file, except here `router.receive` must be a real spy: the
// "forwards to the router" case below asserts on it.
jest.mock('../../src/core/messaging/index', () => ({
    router: { receive: jest.fn() },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { router } from '../../src/core/messaging/index';
import { ScheduleEditorModal } from '../../src/panels/ScheduleEditorModal';

const FAKE_CLIENT = {} as any;

/** messageFromFrame is `protected`; private is compile-time only. */
function deliverToModal(modal: ScheduleEditorModal, message: unknown): void {
    (modal as any).messageFromFrame(message);
}

/**
 * Builds the exact envelope shape ScheduleEditorView's close button sends --
 * see quodsim-react/src/messaging/hooks/useSendMessage.ts:14-52. `source` is
 * the panel's own iframe source (mapped from panelType 'schedule'), `target`
 * is always 'host', `version` is the protocol's only valid value, and `data`
 * defaults to `{}`, never undefined.
 */
function closeModalEnvelope(): any {
    return {
        id: 'close-1',
        type: EnvelopeMessageType.CLOSE_MODAL,
        source: 'schedule-iframe',
        target: 'host',
        version: '1.0',
        data: {},
    };
}

describe('RoutingModal.messageFromFrame -- CLOSE_MODAL seam', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('calls hide() for a real CLOSE_MODAL envelope, built the way the panel builds it', async () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        const hideSpy = jest.spyOn(modal, 'hide');

        // The modal must be visible for this to mean anything -- mirrors the
        // real SDK's Modal.show()/hide() guard (hide() only acts while
        // visible), exercised end to end: show() first, then the close.
        await modal.show();
        expect((modal as any).visible).toBe(true);

        deliverToModal(modal, closeModalEnvelope());

        expect(hideSpy).toHaveBeenCalledTimes(1);
        expect((modal as any).visible).toBe(false);
    });

    it('still hides when the SDK has not yet marked the modal visible (ShowModal ack slow or lost)', () => {
        // Smoke 2026-09-05 (ClickUp 86e34gka7): "[RoutingModal] CLOSE_MODAL
        // received — hiding modal" logged twice with NO effect, then the third
        // click closed the modal. The SDK sets `visible` only after Lucid
        // acknowledges ShowModal, and Modal.hide() is a no-op until then -- so
        // a slow/lost ack leaves a modal on screen that refuses to close. A
        // message FROM the frame proves the frame exists, so the intercept
        // must send HideModal regardless of the flag.
        const sendCommand = jest.fn();
        const modal = new ScheduleEditorModal({ sendCommand } as any, { shapeId: 'gen-1' });
        // show() deliberately NOT called: visible stays false, as it does in
        // production between sendCommand(ShowModal) and its acknowledgement.
        expect((modal as any).visible).toBe(false);

        deliverToModal(modal, closeModalEnvelope());

        expect(sendCommand).toHaveBeenCalledWith('hm', { n: (modal as any).messageActionName });
        expect((modal as any).visible).toBe(false);
        expect(router.receive).not.toHaveBeenCalled();
    });

    it('rejects a non-envelope message without throwing', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        const hideSpy = jest.spyOn(modal, 'hide');

        expect(() => deliverToModal(modal, { not: 'an envelope' })).not.toThrow();
        expect(() => deliverToModal(modal, null)).not.toThrow();
        expect(() => deliverToModal(modal, 'a string')).not.toThrow();

        expect(hideSpy).not.toHaveBeenCalled();
        expect(router.receive).not.toHaveBeenCalled();
    });

    it('forwards any other envelope type to the router instead of hiding', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        const hideSpy = jest.spyOn(modal, 'hide');

        const envelope = {
            id: 'req-1',
            type: EnvelopeMessageType.MODEL_ROOT_REQUEST,
            source: 'schedule-iframe',
            target: 'host',
            version: '1.0',
            data: {},
        };
        deliverToModal(modal, envelope);

        expect(hideSpy).not.toHaveBeenCalled();
        expect(router.receive).toHaveBeenCalledTimes(1);
        expect(router.receive).toHaveBeenCalledWith(
            expect.objectContaining({ type: EnvelopeMessageType.MODEL_ROOT_REQUEST }),
        );
    });
});
