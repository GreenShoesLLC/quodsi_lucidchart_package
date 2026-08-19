// tests/model/patternEditorModal.test.ts
//
// Pins PatternEditorModal's constructor-time computation: the url it builds
// for the packaged extension's quodsim-react bundle, and the size it derives
// from the caller's ModalSize preference via MODAL_SIZE_DIMENSIONS /
// DEFAULT_MODAL_SIZE (the same @quodsi/lucid-shared config StudioEmbedModal
// already uses -- see that file's own `size === 'fullscreen' ? {fullScreen:
// true} : MODAL_SIZE_DIMENSIONS[size]` branch, mirrored here).
//
// The real lucid-extension-sdk Modal is swapped for tests/__mocks__/lucid-extension-sdk.ts
// via jest.config.ts's moduleNameMapper; that mock's Modal captures whatever
// config a RoutingModal subclass passes to `super(client, config)` on
// `.config`, so the assertions below read the config PatternEditorModal
// actually computed rather than reaching into real SDK/iframe machinery.
//
// core/messaging/index must be mocked BEFORE PatternEditorModal is imported.
// RoutingModal imports `router` from there, and that barrel re-exports
// MessageRouter -> handlers/index -> simulationRunHandler -> StudioEmbedModal
// -> RoutingModal -- a real circular require. Reaching it via PatternEditorModal
// (rather than via a handler test, which mocks this same module for the same
// reason -- see simulationRunHandler.requestStudioCatalog.test.ts) makes the
// cycle resolve mid-load and throws "Class extends value undefined". The
// constructor under test never calls router, so an empty stub is enough.
jest.mock('../../src/core/messaging/index', () => ({ router: {} }));

import { DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { PatternEditorModal } from '../../src/panels/PatternEditorModal';

const FAKE_CLIENT = {} as any;

function configOf(modal: PatternEditorModal): any {
    return (modal as any).config;
}

describe('PatternEditorModal', () => {
    it('sizes as fullScreen when the preference is "fullscreen"', () => {
        const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen-1', modalSize: 'fullscreen' });
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
            const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen-1', modalSize: size });
            expect(configOf(modal)).toMatchObject(MODAL_SIZE_DIMENSIONS[size]);
            expect(configOf(modal).fullScreen).toBeUndefined();
        },
    );

    it('defaults to DEFAULT_MODAL_SIZE when no preference is supplied', () => {
        const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        const expected =
            DEFAULT_MODAL_SIZE === 'fullscreen'
                ? { fullScreen: true }
                : MODAL_SIZE_DIMENSIONS[DEFAULT_MODAL_SIZE];
        expect(configOf(modal)).toMatchObject(expected);
    });

    it('builds a url carrying view=pattern and the shape id', () => {
        const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen-42', modalSize: 'medium' });
        const { url } = configOf(modal);
        expect(url).toContain('view=pattern');
        expect(url).toContain('shapeId=gen-42');
    });

    it('URL-encodes a shape id containing reserved characters', () => {
        const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen/1 2', modalSize: 'medium' });
        const { url } = configOf(modal);
        expect(url).toContain(`shapeId=${encodeURIComponent('gen/1 2')}`);
        expect(url).not.toContain('shapeId=gen/1 2');
    });

    it('carries a title and is not chromeless', () => {
        const modal = new PatternEditorModal(FAKE_CLIENT, { shapeId: 'gen-1' });
        expect(configOf(modal).title).toBe('Arrival Pattern');
        expect(configOf(modal).chromeless).toBeFalsy();
    });
});
