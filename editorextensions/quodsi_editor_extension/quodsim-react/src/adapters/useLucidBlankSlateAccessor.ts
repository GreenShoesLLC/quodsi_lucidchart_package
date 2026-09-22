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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

interface ConvertWaiter {
  resolve: (result: ConversionResult) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface InFlightConversion {
  id: string
  waiters: ConvertWaiter[]
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
  const inFlightRef = useRef<InFlightConversion | null>(null)

  // One in-flight AUTO_CONVERT_PAGE conversion per accessor, many waiters:
  // this listener is mounted once (independent of `enabled`, since a
  // conversion started earlier must still be resolvable) and settles every
  // waiter attached to the current in-flight conversion when its result
  // arrives -- a waiter timing out does not stop this listener from hearing
  // a later result for the same conversion. On unmount, every pending timer
  // is cleared and the in-flight entry dropped so nothing fires after teardown.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase | undefined
      if (msg?.type !== EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT) return
      const inFlight = inFlightRef.current
      if (!inFlight || msg.id !== inFlight.id) return
      inFlightRef.current = null
      const data = msg.data as AutoConvertPageResultData
      for (const waiter of inFlight.waiters) {
        clearTimeout(waiter.timeoutId)
        if (data.success) waiter.resolve(data.result)
        else waiter.reject(new Error(data.error))
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      const inFlight = inFlightRef.current
      if (inFlight) {
        for (const waiter of inFlight.waiters) clearTimeout(waiter.timeoutId)
        inFlightRef.current = null
      }
    }
  }, [])

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
        const attach = (inFlight: InFlightConversion) => {
          const waiter: ConvertWaiter = {
            resolve,
            reject,
            timeoutId: setTimeout(() => {
              const idx = inFlight.waiters.indexOf(waiter)
              if (idx >= 0) inFlight.waiters.splice(idx, 1)
              reject(new Error('Conversion timed out'))
            }, AUTO_CONVERT_TIMEOUT_MS),
          }
          inFlight.waiters.push(waiter)
        }

        const existing = inFlightRef.current
        if (existing) {
          attach(existing)
          return
        }

        const inFlight: InFlightConversion = { id: uuid(), waiters: [] }
        inFlightRef.current = inFlight
        attach(inFlight)
        postToHost(EnvelopeMessageType.AUTO_CONVERT_PAGE, { documentId, pageId }, inFlight.id)
      }),
    [documentId, pageId],
  )

  const reviewDiagram = openDiagramMappingModal

  return useMemo(
    () => ({ shapeCount: counts.shapeCount, lineCount: counts.lineCount, convertDiagram, reviewDiagram }),
    [counts, convertDiagram, reviewDiagram],
  )
}
