// The model panel's side of the expression builder modal (spec 2026-11-10).
//
// The state-change dialog awaits EditorHost.openExpressionBuilder. In Lucid
// that opens ExpressionBuilderModal over the canvas (the dock panel is
// ~300px): this hook mints a requestId, sends OPEN_EXPRESSION_BUILDER, and
// resolves with the EXPRESSION_BUILDER_RESULT carrying the same requestId
// (null on Cancel, on the modal's X, or when a builder was already open).
// The host answers every OPEN exactly once, so the promise always settles.
import { useCallback, useEffect, useRef } from 'react'
import {
  EnvelopeMessageType,
  generateUUID,
  type ExpressionBuilderRequest,
  type ExpressionBuilderResultData,
} from '@quodsi/lucid-shared'
import { useMessaging } from '../../messaging/MessageProvider'
import { getModalSizePref } from '../../lib/modalSizePref'

type Pending = { requestId: string; resolve: (expression: string | null) => void }

export function useExpressionBuilderBridge(): (request: ExpressionBuilderRequest) => Promise<string | null> {
  const { sendMessage } = useMessaging()
  const pending = useRef<Pending | null>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const envelope = e.data as { type?: unknown; data?: Partial<ExpressionBuilderResultData> } | undefined
      if (!envelope || envelope.type !== EnvelopeMessageType.EXPRESSION_BUILDER_RESULT) return
      const p = pending.current
      if (!p || envelope.data?.requestId !== p.requestId) return
      pending.current = null
      const expression = envelope.data.expression
      p.resolve(typeof expression === 'string' ? expression : null)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      // The editor went away mid-request: settle its dialog's await.
      const p = pending.current
      pending.current = null
      p?.resolve(null)
    }
  }, [])

  return useCallback(
    (request: ExpressionBuilderRequest) => {
      // One request at a time: an earlier one still waiting is answered null.
      const prior = pending.current
      pending.current = null
      prior?.resolve(null)

      const requestId = generateUUID()
      return new Promise<string | null>((resolve) => {
        pending.current = { requestId, resolve }
        sendMessage(EnvelopeMessageType.OPEN_EXPRESSION_BUILDER, {
          requestId,
          request,
          modalSize: getModalSizePref(),
        })
      })
    },
    [sendMessage],
  )
}
