import { useEffect, useState } from 'react';
import { EnvelopeMessageType, isEnvelope } from '@quodsi/lucid-shared';
import { useMessaging } from '../../messaging/MessageProvider';
import { EmbeddedStudioFrame } from './EmbeddedStudioFrame';

/**
 * Generic host for an embedded Studio surface. The modal is chromeless (no
 * native Lucid title bar / X — users mistook the X for a sub-window close), so
 * this view renders its own header: the title on the left and, on the right, an
 * optional "↗ Open full screen" plus an unambiguous "✕ Close" that asks the
 * host to hide the modal. Used by scenarios, results, and animation callers.
 *
 * Pending opens: the host can open the modal INSTANTLY (before the server model
 * id is resolved) by passing `pending=1` instead of `studioPath`. In that case
 * we render the header + a busy spinner immediately and PULL the resolved path
 * from the host (REQUEST_STUDIO_EMBED_PATH → STUDIO_EMBED_PATH). Pulling AFTER
 * mount guarantees our channel is registered first, so the reply isn't dropped.
 */
export function StudioEmbedView() {
  const { sendMessage } = useMessaging();
  const params = new URLSearchParams(window.location.search);
  const studioOrigin = params.get('studioOrigin');
  const initialPath = params.get('studioPath');
  const pending = params.get('pending') === '1';
  const fullScreenPath = params.get('fullScreenPath');
  const title = params.get('title') ?? '';
  // Public Studio pages (e.g. /status under PublicLayout) don't run the token
  // relay; tell the frame not to gate its "Loading…" overlay on a token.
  const isPublic = params.get('public') === '1';

  // Concrete opens carry studioPath up front; pending opens resolve it via pull.
  const [resolvedPath, setResolvedPath] = useState<string | null>(initialPath);
  const [pathError, setPathError] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.STUDIO_EMBED_PATH) {
        const d = (e.data.data ?? {}) as { studioPath?: string | null; error?: string };
        if (d.studioPath) {
          setResolvedPath(d.studioPath);
          setPathError(null);
        } else {
          setPathError(d.error ?? 'Could not load this view.');
        }
      }
    }
    window.addEventListener('message', onMessage);
    // Pull the resolved path. Runs on mount (after the channel registers), so
    // the host's reply lands — no push-before-ready race. Idempotent under
    // StrictMode double-mount (the host answers each request from one promise).
    sendMessage(EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH);
    return () => window.removeEventListener('message', onMessage);
  }, [pending, sendMessage]);

  if (!studioOrigin || (!pending && !initialPath)) {
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
        {resolvedPath ? (
          <EmbeddedStudioFrame studioPath={resolvedPath} studioOrigin={studioOrigin} requiresToken={!isPublic} />
        ) : pathError ? (
          <div className="h-full w-full flex items-center justify-center" style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
            {pathError} Try closing and reopening.
          </div>
        ) : (
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6b7280' }}>
            <span style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #d1d5db', borderTopColor: '#6b7280', borderRadius: '50%', animation: 'quodsi-spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading…</span>
            <style>{'@keyframes quodsi-spin { to { transform: rotate(360deg); } }'}</style>
          </div>
        )}
      </div>
    </div>
  );
}
