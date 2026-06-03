import { useEffect, useRef, useState } from 'react';
import { EnvelopeMessageType, isEnvelope } from '@quodsi/shared';
import { useMessaging } from '../../messaging/MessageProvider';

const STUDIO_ORIGIN =
  new URLSearchParams(window.location.search).get('studioOrigin') ||
  'https://dev-studio.quodsi.com';

interface Props {
  /** Studio path to embed, e.g. `/embed/scenarios/<id>/results`. `?embed=1` is appended. */
  studioPath: string;
}

/**
 * Reusable host for an authenticated embedded Studio page inside the Lucid
 * extension. Runs the token relay: when the Studio iframe asks for a token
 * (QUODSI_EMBED_TOKEN_REFRESH), request it from the host (REQUEST_STUDIO_TOKEN);
 * when the host replies (STUDIO_TOKEN), forward it into the iframe
 * (QUODSI_EMBED_TOKEN). Foundation for every Path 1 embed.
 */
export function EmbeddedStudioFrame({ studioPath }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { sendMessage } = useMessaging();
  const [gotToken, setGotToken] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function armTimeout() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      // Count from when Studio actually asks for the token (it's up and only
      // waiting on the relay now), not from mount — avoids a false error while
      // the iframe is still loading on a slow connection.
      timerRef.current = window.setTimeout(() => setTimedOut(true), 10000);
    }
    function onMessage(e: MessageEvent) {
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.STUDIO_TOKEN) {
        const token = (e.data.data as { token?: string })?.token;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'QUODSI_EMBED_TOKEN', token }, STUDIO_ORIGIN,
        );
        if (token) {
          setGotToken(true);
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        }
        return;
      }
      if (e.origin === STUDIO_ORIGIN && e.data?.type === 'QUODSI_EMBED_TOKEN_REFRESH') {
        sendMessage(EnvelopeMessageType.REQUEST_STUDIO_TOKEN);
        armTimeout();
      }
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [sendMessage]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {timedOut && !gotToken && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center', background: '#fff', zIndex: 1 }}>
          Couldn't load the results viewer — make sure you're signed in to Quodsi in this panel.
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="embedded-studio"
        src={`${STUDIO_ORIGIN}${studioPath}?embed=1`}
        style={{ height: '100%', width: '100%', border: 'none' }}
      />
    </div>
  );
}
