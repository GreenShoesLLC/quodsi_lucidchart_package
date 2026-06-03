import { EmbeddedStudioFrame } from './EmbeddedStudioFrame';

const params = new URLSearchParams(window.location.search);
const STUDIO_ORIGIN = params.get('studioOrigin');
const STUDIO_PATH = params.get('studioPath');
const FULL_SCREEN_PATH = params.get('fullScreenPath');

/**
 * Generic host for an embedded Studio surface. Renders EmbeddedStudioFrame at
 * the studioPath (from the modal URL) and, when a fullScreenPath is provided, a
 * small "↗ Open full screen" button that opens the standalone Studio page in a
 * new tab. Used by results, animation, and future embed callers.
 */
export function StudioEmbedView() {
  if (!STUDIO_PATH) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p style={{ textAlign: 'center', padding: 16 }}>Results viewer misconfigured (missing studioPath).</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {FULL_SCREEN_PATH && STUDIO_ORIGIN && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px', borderBottom: '1px solid #eee' }}>
          <button
            type="button"
            onClick={() => window.open(`${STUDIO_ORIGIN}${FULL_SCREEN_PATH}`, '_blank', 'noopener')}
            style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
            title="Open full screen in a new tab"
          >
            ↗ Open full screen
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <EmbeddedStudioFrame studioPath={STUDIO_PATH} />
      </div>
    </div>
  );
}
