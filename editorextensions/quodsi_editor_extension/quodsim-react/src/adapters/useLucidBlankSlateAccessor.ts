// quodsim-react/src/adapters/useLucidBlankSlateAccessor.ts
//
// LucidChart's BlankSlateConverterAccessor (spec 2026-09-15 section 1): the
// shared blank-slate card's shape/line counts, one-click conversion and review
// link, over the extension's page-conversion messages.
//
//   - counts: PAGE_COUNTS_REQUEST -> PAGE_COUNTS, asked on mount and after
//     every selection change while the card shows, so they follow the user's
//     drawing;
//   - convertDiagram: AUTO_CONVERT_PAGE, resolved or rejected by the
//     AUTO_CONVERT_PAGE_RESULT carrying the same envelope id (the
//     mint-your-own-correlation-id idiom of modelOpsSender.updateElement);
//   - reviewDiagram: the Diagram Mapping modal, as the old card's link did.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import {
  EnvelopeMessageType,
  type AutoConvertPageResultData,
  type EnvelopeBase,
  type PageCountsData,
} from '@quodsi/lucid-shared'
import type { BlankSlateConverterAccessor, ConversionResult } from 'quodsi_studio/platforms/shared'
import { useSimulationRunSender } from '../messaging/senders/simulationRunSender'

/** How long convertDiagram waits for AUTO_CONVERT_PAGE_RESULT. */
export const AUTO_CONVERT_TIMEOUT_MS = 60_000

function postToHost(type: EnvelopeMessageType, data: unknown, id: string = uuid()): void {
  const envelope: EnvelopeBase = { id, type, source: 'model-iframe', target: 'host', version: '1.0', data }
  window.parent.postMessage(envelope, '*')
}

export function useLucidBlankSlateAccessor(options: {
  /** True only while the page is unconverted; nothing is sent otherwise. */
  enabled: boolean
  documentId: string
  pageId: string
  /** Changes on every selection update (selection.lastUpdated); re-asks for counts. */
  selectionVersion: number | undefined
}): BlankSlateConverterAccessor {
  const { enabled, documentId, pageId, selectionVersion } = options
  const { openDiagramMappingModal } = useSimulationRunSender()
  const [counts, setCounts] = useState({ shapeCount: 0, lineCount: 0 })

  useEffect(() => {
    if (!enabled) return
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase | undefined
      if (msg?.type !== EnvelopeMessageType.PAGE_COUNTS) return
      const data = msg.data as PageCountsData
      setCounts({ shapeCount: data.shapeCount, lineCount: data.lineCount })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    postToHost(EnvelopeMessageType.PAGE_COUNTS_REQUEST, {})
  }, [enabled, pageId, selectionVersion])

  const convertDiagram = useCallback(
    () =>
      new Promise<ConversionResult>((resolve, reject) => {
        const id = uuid()
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        const onMessage = (event: MessageEvent) => {
          const msg = event.data as EnvelopeBase | undefined
          if (msg?.id !== id || msg.type !== EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT) return
          window.removeEventListener('message', onMessage)
          if (timeoutId !== undefined) clearTimeout(timeoutId)
          const data = msg.data as AutoConvertPageResultData
          if (data.success) resolve(data.result)
          else reject(new Error(data.error))
        }
        window.addEventListener('message', onMessage)
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', onMessage)
          reject(new Error('Conversion timed out'))
        }, AUTO_CONVERT_TIMEOUT_MS)
        postToHost(EnvelopeMessageType.AUTO_CONVERT_PAGE, { documentId, pageId }, id)
      }),
    [documentId, pageId],
  )

  const reviewDiagram = useCallback(
    () => openDiagramMappingModal(documentId, pageId),
    [openDiagramMappingModal, documentId, pageId],
  )

  return useMemo(
    () => ({ shapeCount: counts.shapeCount, lineCount: counts.lineCount, convertDiagram, reviewDiagram }),
    [counts, convertDiagram, reviewDiagram],
  )
}
