// tests/model/scheduleEditorModal.test.ts
//
// Pins ScheduleEditorModal's constructor-time computation: the url it builds
// for the packaged extension's quodsim-react bundle, the size it derives
// from the caller's ModalSize preference via MODAL_SIZE_DIMENSIONS /
// DEFAULT_MODAL_SIZE (same @quodsi/lucid-shared config PatternEditorModal /
// StudioEmbedModal already use), and -- the one deliberate difference from
// PatternEditorModal -- that this modal is CHROMELESS: quodsi_studio's
// ScheduleModal renders its own 900x640 card with its own header and close
// button, so a titled Lucid modal would stack a second set of chrome around
// it.
//
// The real lucid-extension-sdk Modal is swapped for tests/__mocks__/lucid-extension-sdk.ts
// via jest.config.ts's moduleNameMapper; that mock's Modal captures whatever
// config a RoutingModal subclass passes to `super(client, config)` on
// `.config`, so the assertions below read the config ScheduleEditorModal
// actually computed rather than reaching into real SDK/iframe machinery.
//
// core/messaging/index must be mocked BEFORE ScheduleEditorModal is imported.
// RoutingModal imports `router` from there, and that barrel re-exports
// MessageRouter -> handlers/index -> simulationRunHandler -> StudioEmbedModal
// -> RoutingModal -- a real circular require. Reaching it via ScheduleEditorModal
// (rather than via a handler test, which mocks this same module for the same
// reason -- see simulationRunHandler.requestStudioCatalog.test.ts) makes the
// cycle resolve mid-load and throws "Class extends value undefined". The
// constructor under test never calls router, so an empty stub is enough.
jest.mock('../../src/core/messaging/index', () => ({ router: {} }));

import { DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { ScheduleEditorModal } from '../../src/panels/ScheduleEditorModal';

const FAKE_CLIENT = {} as any;

function configOf(modal: ScheduleEditorModal): any {
    return (modal as any).config;
}

/**
 * RoutingModal stores its constructor's third argument -- the channel role
 * -- on the private `channelRole` field (see RoutingModal.ts's
 * `messageFromFrame`, which reads `${this.channelRole}-iframe`). Private is
 * compile-time only; `as any` reaches the real runtime field.
 */
function channelRoleOf(modal: ScheduleEditorModal): unknown {
    return (modal as any).channelRole;
}

describe('ScheduleEditorModal', () => {
    it('sizes as fullScreen when the preference is "fullscreen"', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1', modalSize: 'fullscreen' });
        expect(configOf(modal)).toMatchObject({ fullScreen: true });
        // fullscreen has no width/height -- assert they're absent, not just
        // that fullScreen is truthy, so a stray width/height sneaking in
        // alongside fullScreen: true would fail this test.
        expect(configOf(modal).width).toBeUndefined();
        expect(configOf(modal).height).toBeUndefined();
    });

    it.each(['medium', 'large', 'xlarge'] as const)(
        'sizes "%s" from MODAL_SIZE_DIMENSIONS',
        (size) => {
            const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1', modalSize: size });
            expect(configOf(modal)).toMatchObject(MODAL_SIZE_DIMENSIONS[size]);
            expect(configOf(modal).fullScreen).toBeUndefined();
        },
    );

    it('defaults to DEFAULT_MODAL_SIZE when no preference is supplied', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        const expected =
            DEFAULT_MODAL_SIZE === 'fullscreen'
                ? { fullScreen: true }
                : MODAL_SIZE_DIMENSIONS[DEFAULT_MODAL_SIZE];
        expect(configOf(modal)).toMatchObject(expected);
    });

    it('builds a url carrying view=schedule and the shape id', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-42', modalSize: 'medium' });
        const { url } = configOf(modal);
        expect(url).toContain('view=schedule');
        expect(url).toContain('shapeId=gen-42');
    });

    it('URL-encodes a shape id containing reserved characters', () => {
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen/1 2', modalSize: 'medium' });
        const { url } = configOf(modal);
        expect(url).toContain(`shapeId=${encodeURIComponent('gen/1 2')}`);
        expect(url).not.toContain('shapeId=gen/1 2');
    });

    it('is chromeless and carries no title -- the deliberate difference from PatternEditorModal', () => {
        // ScheduleModal (quodsim-react) renders its own 900x640 card with its
        // own header and close button. A titled Lucid modal here would stack
        // a second title bar and a second close button around it.
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        expect(configOf(modal).chromeless).toBe(true);
        expect(configOf(modal).title).toBeUndefined();
    });

    it('registers itself on the "schedule" channel, not "pattern" or any other role', () => {
        // The channel role is what makes the modal reachable by the router
        // (RoutingModal.frameLoaded registers it, messageFromFrame stamps
        // outgoing envelopes with it). A copy-paste leaving 'pattern' here
        // would pass every other test in this file -- url/size/chromeless are
        // all independent of it -- and produce a modal that opens and then
        // silently receives nothing.
        const modal = new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        expect(channelRoleOf(modal)).toBe('schedule');
    });

    it('does not invoke onClosed at construction time', () => {
        // frameClosed itself (and the double-open guard it releases) is
        // exercised against a real ChannelManager stub in
        // tests/messaging/modelRootHandler.scheduleModalGuard.test.ts --
        // this file's router mock is an empty `{}` stub (see the header
        // comment), too thin for frameClosed's own getChannelManager() call.
        const onClosed = jest.fn();
        new ScheduleEditorModal(FAKE_CLIENT, { shapeId: 'gen-1', onClosed });
        expect(onClosed).not.toHaveBeenCalled();
    });
});
