import { useEffect, useRef, useState } from 'react';
import { EnvelopeMessageType, isEnvelope } from '@quodsi/lucid-shared';
import { useMessaging } from '../../messaging/MessageProvider';

interface Props {
  /** Studio path to embed, e.g. `/embed/scenarios/<id>/results`. `?embed=1` is appended. */
  studioPath: string;
  /** Origin of the Studio app (e.g. `https://studio.quodsi.com`). Provided by the parent. */
  studioOrigin: string;
  /**
   * Whether this embedded Studio page participates in the auth token relay.
   * Authed surfaces (Studies, Diagram Mapping — under Studio's EmbeddedLayout)
   * request a token via QUODSI_EMBED_TOKEN_REFRESH, and we cover the iframe with
   * a "Loading…" overlay until STUDIO_TOKEN arrives. Public pages (e.g. /status
   * under PublicLayout) never do that handshake, so gating on it would spin
   * forever — pass `false` to show the iframe immediately. Defaults to `true`.
   */
  requiresToken?: boolean;
}

/**
 * Reusable host for an authenticated embedded Studio page inside the Lucid
 * extension. Runs the token relay: when the Studio iframe asks for a token
 * (QUODSI_EMBED_TOKEN_REFRESH), request it from the host (REQUEST_STUDIO_TOKEN);
 * when the host replies (STUDIO_TOKEN), forward it into the iframe
 * (QUODSI_EMBED_TOKEN). Foundation for every Path 1 embed.
 */
export function EmbeddedStudioFrame({ studioPath, studioOrigin, requiresToken = true }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { sendMessage } = useMessaging();
  const [gotToken, setGotToken] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Re-arm safety: when the host replies with an empty token (auth still
  // establishing), poll for it instead of waiting out the full timeout.
  const retryRef = useRef<number | null>(null);

  // All hooks must come before any conditional return (Rules of Hooks).
  useEffect(() => {
    function armTimeout() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      // Count from when Studio actually asks for the token (it's up and only
      // waiting on the relay now), not from mount — avoids a false error while
      // the iframe is still loading on a slow connection.
      timerRef.current = window.setTimeout(() => setTimedOut(true), 10000);
    }
    function onMessage(e: MessageEvent) {
      // Fix #1 (STUDIO_TOKEN hop): only accept the host reply from window.parent.
      // NOTE — smoke-test-sensitive: if the Lucid SDK delivers host messages
      // from a source other than window.parent (e.g. via an intermediate frame),
      // the relay will silently stop. Relax this check in that case.
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.STUDIO_TOKEN) {
        if (e.source !== window.parent) return;
        const token = (e.data.data as { token?: string })?.token;
        if (token) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'QUODSI_EMBED_TOKEN', token }, studioOrigin,
          );
          setGotToken(true);
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
          if (retryRef.current !== null) {
            window.clearTimeout(retryRef.current);
            retryRef.current = null;
          }
        } else {
          // Host had no cached token yet (auth still establishing on a cold
          // load). Re-request shortly instead of forwarding an empty token and
          // silently waiting out the timeout. The armTimeout() deadline still
          // governs ultimate failure, so this polls at most until then — it
          // cannot loop forever. Guard on retryRef so we keep a single pending
          // retry regardless of how many empty replies arrive.
          if (retryRef.current === null) {
            retryRef.current = window.setTimeout(() => {
              retryRef.current = null;
              sendMessage(EnvelopeMessageType.REQUEST_STUDIO_TOKEN);
            }, 1000);
          }
        }
        return;
      }
      // Fix #1 (REFRESH hop): tighten to messages that actually originate from
      // our Studio iframe, not just any window on studioOrigin.
      if (
        e.origin === studioOrigin &&
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'QUODSI_EMBED_TOKEN_REFRESH'
      ) {
        sendMessage(EnvelopeMessageType.REQUEST_STUDIO_TOKEN);
        armTimeout();
      }
      // Catalog hop (response): host sends STUDIO_CATALOG -> forward into the iframe.
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.STUDIO_CATALOG) {
        if (e.source !== window.parent) return;
        const catalog = (e.data.data as { catalog?: unknown })?.catalog;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'QUODSI_EMBED_MODEL_CATALOG', catalog }, studioOrigin,
        );
        return;
      }
      // Run result (response): host sends RUN_SCENARIO_RESULT -> forward into the iframe.
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.RUN_SCENARIO_RESULT) {
        if (e.source !== window.parent) return;
        const d = e.data.data as { scenarioId?: string; accepted?: boolean; error?: string };
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'QUODSI_RUN_SCENARIO_RESULT', scenarioId: d?.scenarioId, accepted: d?.accepted, error: d?.error },
          studioOrigin,
        );
        return;
      }
      // Page analysis result (response): host sends PAGE_ANALYSIS_RESULT -> forward into the iframe.
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.PAGE_ANALYSIS_RESULT) {
        if (e.source !== window.parent) return;
        const d = e.data.data as { requestId?: number; data?: unknown; error?: string };
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'QUODSI_PAGE_ANALYSIS_RESULT', requestId: d?.requestId, data: d?.data, error: d?.error }, studioOrigin);
        return;
      }
      // Apply shape changes result (response): host sends APPLY_SHAPE_CHANGES_RESULT -> forward into the iframe.
      if (isEnvelope(e.data) && e.data.type === EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT) {
        if (e.source !== window.parent) return;
        const d = e.data.data as { requestId?: number; success?: boolean; error?: string };
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'QUODSI_APPLY_CHANGES_RESULT', requestId: d?.requestId, success: d?.success, error: d?.error }, studioOrigin);
        return;
      }
      // Catalog hop (request): iframe asks for the catalog -> ask the host.
      if (
        e.origin === studioOrigin &&
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'QUODSI_EMBED_CATALOG_REQUEST'
      ) {
        sendMessage(EnvelopeMessageType.REQUEST_STUDIO_CATALOG);
        return;
      }
      // Run delegation: iframe asks to run a scenario -> forward to the extension.
      if (
        e.origin === studioOrigin &&
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'QUODSI_RUN_SCENARIO'
      ) {
        sendMessage(EnvelopeMessageType.RUN_SCENARIO, {
          scenarioId: (e.data as { scenarioId?: string }).scenarioId,
          enableAnimation: (e.data as { enableAnimation?: boolean }).enableAnimation ?? false,
        });
        return;
      }
      // Locate element: iframe asks the host to select a diagram element on the canvas.
      if (
        e.origin === studioOrigin &&
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'QUODSI_LOCATE_ELEMENT'
      ) {
        sendMessage(EnvelopeMessageType.LOCATE_ELEMENT, {
          elementId: (e.data as { elementId?: string }).elementId,
        });
        return;
      }
      // Analyze page: iframe asks the host to analyze the diagram page for shape mapping.
      if (e.origin === studioOrigin && e.source === iframeRef.current?.contentWindow
          && e.data?.type === 'QUODSI_ANALYZE_PAGE') {
        sendMessage(EnvelopeMessageType.ANALYZE_PAGE, { requestId: (e.data as { requestId?: number }).requestId });
        return;
      }
      // Apply shape changes: iframe asks the host to apply shape changes to the diagram.
      if (e.origin === studioOrigin && e.source === iframeRef.current?.contentWindow
          && e.data?.type === 'QUODSI_APPLY_CHANGES') {
        sendMessage(EnvelopeMessageType.APPLY_SHAPE_CHANGES, {
          requestId: (e.data as { requestId?: number }).requestId,
          changes: (e.data as { changes?: unknown }).changes,
        });
        return;
      }
      // Close embed: iframe asks the host to close the Studies modal (e.g. after
      // "Go to source" so the located shape is visible on the canvas). Re-uses the
      // existing CLOSE_MODAL path which RoutingModal.messageFromFrame intercepts and
      // calls this.hide() — no new message type or extension-side handler needed.
      if (
        e.origin === studioOrigin &&
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'QUODSI_CLOSE_EMBED'
      ) {
        sendMessage(EnvelopeMessageType.CLOSE_MODAL);
        return;
      }
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (retryRef.current !== null) window.clearTimeout(retryRef.current);
    };
  }, [sendMessage, studioOrigin]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {requiresToken && !gotToken && !timedOut && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, textAlign: 'center', background: '#fff', zIndex: 1, color: '#6b7280' }}>
          <span style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #d1d5db', borderTopColor: '#6b7280', borderRadius: '50%', animation: 'quodsi-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Loading…</span>
          <style>{'@keyframes quodsi-spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      )}
      {requiresToken && timedOut && !gotToken && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center', background: '#fff', zIndex: 1 }}>
          Couldn't load the results viewer — make sure you're signed in to Quodsi in this panel.
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="embedded-studio"
        src={`${studioOrigin}${studioPath}?embed=1`}
        style={{ height: '100%', width: '100%', border: 'none' }}
      />
    </div>
  );
}
