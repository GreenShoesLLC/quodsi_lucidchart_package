import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { useMessaging } from '../../messaging/MessageProvider';
import { EmbeddedStudioFrame } from './EmbeddedStudioFrame';

/**
 * Generic host for an embedded Studio surface. The modal is chromeless (no
 * native Lucid title bar / X — users mistook the X for a sub-window close), so
 * this view renders its own header: the title on the left and, on the right, an
 * optional "↗ Open full screen" plus an unambiguous "✕ Close" that asks the
 * host to hide the modal. Used by scenarios, results, and animation callers.
 */
export function StudioEmbedView() {
  const { sendMessage } = useMessaging();
  const params = new URLSearchParams(window.location.search);
  const studioOrigin = params.get('studioOrigin');
  const studioPath = params.get('studioPath');
  const fullScreenPath = params.get('fullScreenPath');
  const title = params.get('title') ?? '';

  if (!studioPath || !studioOrigin) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p style={{ textAlign: 'center', padding: 16 }}>Results viewer misconfigured (missing studioPath/studioOrigin).</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {fullScreenPath && (
            <button
              type="button"
              onClick={() => window.open(`${studioOrigin}${fullScreenPath}`, '_blank', 'noopener')}
              style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Open full screen in a new tab"
            >
              ↗ Open full screen
            </button>
          )}
          <button
            type="button"
            onClick={() => sendMessage(EnvelopeMessageType.CLOSE_MODAL)}
            style={{ fontSize: 12, color: '#374151', background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}
            title="Close and return to your diagram"
          >
            ✕ Close
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <EmbeddedStudioFrame studioPath={studioPath} studioOrigin={studioOrigin} />
      </div>
    </div>
  );
}
