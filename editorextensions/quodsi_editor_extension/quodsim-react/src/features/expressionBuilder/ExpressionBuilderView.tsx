// React view rendered inside ExpressionBuilderModal's real Lucid modal
// (?view=expression, spec 2026-11-10). It waits for the host's
// EXPRESSION_BUILDER_INIT, renders Studio's shared ExpressionBuilder
// full-size, and answers with one EXPRESSION_BUILDER_RESULT: the expression
// on Use, null on Cancel (or Escape, which the builder maps to Cancel). The
// host forwards it to the model panel and closes this modal; the modal's own
// X is the host's concern (it answers null from frameClosed).
//
// The builder reads request.expression only on mount, so it is not rendered
// until INIT arrives, and a repeated INIT is ignored rather than resetting
// the user's edits.
import { useCallback, useEffect, useRef, useState } from 'react'
import { EnvelopeMessageType, type ExpressionBuilderInitData } from '@quodsi/lucid-shared'
import { ExpressionBuilder } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'

export function ExpressionBuilderView() {
  const { sendMessage } = useMessaging()
  const [init, setInit] = useState<ExpressionBuilderInitData | null>(null)
  const answered = useRef(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const envelope = e.data as { type?: unknown; data?: Partial<ExpressionBuilderInitData> } | undefined
      if (!envelope || envelope.type !== EnvelopeMessageType.EXPRESSION_BUILDER_INIT) return
      const data = envelope.data
      if (!data?.requestId || !data.request) return
      const next: ExpressionBuilderInitData = { requestId: data.requestId, request: data.request }
      setInit((prev) => prev ?? next)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const answer = useCallback(
    (expression: string | null) => {
      if (!init || answered.current) return
      answered.current = true
      sendMessage(EnvelopeMessageType.EXPRESSION_BUILDER_RESULT, { requestId: init.requestId, expression })
    },
    [init, sendMessage],
  )
  const onUse = useCallback((expression: string) => answer(expression), [answer])
  const onCancel = useCallback(() => answer(null), [answer])

  if (!init) {
    return <div className="p-3 text-xs text-muted">Loading…</div>
  }
  return (
    <div className="h-full w-full bg-surface">
      <ExpressionBuilder request={init.request} onUse={onUse} onCancel={onCancel} />
    </div>
  )
}
