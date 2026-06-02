import { useEffect, useRef, useState } from 'react';

// Spike 0: prove Lucid will host a nested cross-origin Studio iframe.
// STUDIO_ORIGIN is passed from the extension modal as a URL query param so the
// correct per-environment Studio origin is used without hardcoding. Falls back
// to dev if the param is absent (e.g. direct browser preview).
const STUDIO_ORIGIN =
  new URLSearchParams(window.location.search).get('studioOrigin') ||
  'https://dev-studio.quodsi.com';
const PROBE_PATH = '/login'; // any always-renderable Studio page; no auth needed to render the shell

export function StudioEmbedSpike() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [events, setEvents] = useState<string[]>([]);

  const log = (m: string) => setEvents((prev) => [...prev, `${prev.length}: ${m}`]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== STUDIO_ORIGIN) return;
      log(`postMessage from Studio: ${JSON.stringify(e.data)}`);
    }
    window.addEventListener('message', onMessage);
    log(`mounted; ancestor origin=${window.location.origin}`);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 12, padding: 4, background: '#eef' }}>
        Studio embed spike — iframe below should render Studio.
        <button
          onClick={() =>
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'QUODSI_PROBE_PING' },
              STUDIO_ORIGIN,
            )
          }
        >
          Send ping
        </button>
      </div>
      <iframe
        ref={iframeRef}
        title="studio-embed-spike"
        src={`${STUDIO_ORIGIN}${PROBE_PATH}`}
        onLoad={() => log('iframe onLoad fired')}
        style={{ flex: 1, border: '2px solid green', width: '100%' }}
      />
      <pre style={{ fontSize: 11, maxHeight: 120, overflow: 'auto', margin: 0 }}>
        {events.join('\n')}
      </pre>
    </div>
  );
}
