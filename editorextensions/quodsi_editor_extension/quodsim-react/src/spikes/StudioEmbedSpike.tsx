import { useEffect, useRef, useState } from 'react';
import { EnvelopeMessageType, isEnvelope } from '@quodsi/shared';
import { useMessaging } from '../messaging/MessageProvider';

// STUDIO_ORIGIN is passed from the extension modal as a URL query param so the
// correct per-environment Studio origin is used without hardcoding. Falls back
// to dev if the param is absent (e.g. direct browser preview).
const STUDIO_ORIGIN =
  new URLSearchParams(window.location.search).get('studioOrigin') ||
  'https://dev-studio.quodsi.com';

export function StudioEmbedSpike() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [events, setEvents] = useState<string[]>([]);
  const { sendMessage } = useMessaging();

  const log = (m: string) =>
    setEvents((prev) => [...prev, `${prev.length}: ${new Date().toISOString().slice(11, 23)} ${m}`]);

  // Listen for messages on this window:
  //   1. STUDIO_TOKEN envelope from the Lucid host → forward token to Studio iframe
  //   2. QUODSI_EMBED_TOKEN_REFRESH from the Studio iframe → request token from host
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // --- Branch A: message from Lucid host (an envelope) carrying STUDIO_TOKEN ---
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.STUDIO_TOKEN) {
        const token: string | undefined = (e.data.data as any)?.token;
        log(`STUDIO_TOKEN received from host (hasToken=${!!token})`);

        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
          log('ERROR: iframe not ready, cannot forward token');
          return;
        }

        iframe.contentWindow.postMessage(
          { type: 'QUODSI_EMBED_TOKEN', token },
          STUDIO_ORIGIN,
        );
        log('QUODSI_EMBED_TOKEN relayed to Studio iframe');
        return;
      }

      // --- Branch B: message from Studio iframe requesting a token ---
      if (e.origin === STUDIO_ORIGIN && e.data?.type === 'QUODSI_EMBED_TOKEN_REFRESH') {
        log('QUODSI_EMBED_TOKEN_REFRESH received from Studio; requesting token from host');
        sendMessage(EnvelopeMessageType.REQUEST_STUDIO_TOKEN);
        log('REQUEST_STUDIO_TOKEN sent to host');
        return;
      }

      // --- Other messages from Studio origin (diagnostics) ---
      if (e.origin === STUDIO_ORIGIN) {
        log(`postMessage from Studio: ${JSON.stringify(e.data)}`);
      }
    }

    window.addEventListener('message', onMessage);
    log(`mounted; STUDIO_ORIGIN=${STUDIO_ORIGIN}`);
    return () => window.removeEventListener('message', onMessage);
  }, [sendMessage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 12, padding: 4, background: '#eef' }}>
        Studio embed spike — iframe below should render Studio at{' '}
        <code>{STUDIO_ORIGIN}/embed?embed=1</code>
      </div>
      <iframe
        ref={iframeRef}
        title="studio-embed-spike"
        src={`${STUDIO_ORIGIN}/embed?embed=1`}
        onLoad={() => log('iframe onLoad fired')}
        style={{ flex: 1, border: '2px solid green', width: '100%' }}
      />
      <pre
        style={{
          fontSize: 11,
          maxHeight: 140,
          overflow: 'auto',
          margin: 0,
          padding: '2px 4px',
          background: '#f5f5f5',
        }}
      >
        {events.join('\n')}
      </pre>
    </div>
  );
}
