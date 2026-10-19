// quodsim-react/src/features/onboarding/lucidTourPlatform.ts
//
// The side panel's TourPlatform (spec 2026-10-16 §5): what loading the
// example, selecting a shape and watching the diagram mean in Lucid. The work
// itself is the extension's (tourHandler.ts); this side only sends the tour
// messages and reads their replies.
import { v4 as uuid } from 'uuid'
import {
  EnvelopeMessageType,
  type EnvelopeBase,
  type TourLoadExampleResultData,
} from '@quodsi/lucid-shared'
import type { AppEventName, ExampleLoadOutcome, TourPlatform } from 'quodsi_studio/platforms/shared'
import { createDockedRenderer } from './dockedRenderer'
import { clearExamplePageId, readExamplePageId, readTourOwner, writeExamplePage } from './examplePageStore'
import { ownsPanel } from './stepFrames'

/** How long a tour request waits for the extension's reply. */
export const HOST_REPLY_TIMEOUT_MS = 60_000

/** Send one envelope to the extension (the useLucidBlankSlateAccessor idiom). */
export function postToHost(type: EnvelopeMessageType, data: unknown, id: string = uuid()): void {
  const envelope: EnvelopeBase = { id, type, source: 'model-iframe', target: 'host', version: '1.0', data: data as never }
  window.parent.postMessage(envelope, '*')
}

/**
 * Send `type` and resolve with the data of the `replyType` envelope that comes
 * back under the same id; reject after HOST_REPLY_TIMEOUT_MS.
 */
export function requestFromHost(
  type: EnvelopeMessageType,
  data: unknown,
  replyType: EnvelopeMessageType,
): Promise<unknown> {
  const id = uuid()
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase | undefined
      if (msg?.type !== replyType || msg.id !== id) return
      done()
      resolve(msg.data)
    }
    const timer = setTimeout(() => {
      done()
      reject(new Error(`${type} timed out`))
    }, HOST_REPLY_TIMEOUT_MS)
    const done = () => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
    window.addEventListener('message', onMessage)
    postToHost(type, data, id)
  })
}

export type LucidPanelPlatformDeps = {
  send(type: EnvelopeMessageType, data: unknown): void
  request(type: EnvelopeMessageType, data: unknown, replyType: EnvelopeMessageType): Promise<unknown>
  /** Where the docked card renders (pinned at the top of the panel). */
  container: HTMLElement
  /** The current page's converted flag, as the panel's model context has it. */
  getIsConverted(): boolean
  getCurrentPageId(): string | undefined
  /** The panel's document: where a loaded example puts the tour (ruling 7). */
  getDocumentId(): string | undefined
  userKey: string
}

export type LucidPanelPlatform = TourPlatform & {
  /** Re-read the converted flag and page; the host calls it when they change. */
  sync(): void
}

export function createLucidPanelPlatform(deps: LucidPanelPlatformDeps): LucidPanelPlatform {
  const emitters = new Set<(e: AppEventName) => void>()
  let wasConverted = deps.getIsConverted()

  return {
    createRenderer: () => createDockedRenderer(deps.container),
    ownsStep: ownsPanel,

    async loadExample({ replace }): Promise<ExampleLoadOutcome> {
      try {
        const reply = (await deps.request(
          EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace }, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT,
        )) as TourLoadExampleResultData | undefined
        if (reply?.outcome === 'loaded') {
          // The start click already claimed this document; the context may
          // not have named it yet, so fall back to that claim.
          const documentId = deps.getDocumentId() ?? readTourOwner(deps.userKey)?.documentId
          if (documentId) writeExamplePage(deps.userKey, documentId, reply.pageId)
          return 'loaded'
        }
        if (reply?.outcome === 'occupied') return 'occupied'
      } catch {
        // A timeout is a failed load: the session's recovery step handles it.
      }
      // No example page: the tour carries on with whatever page the user
      // opens, so a stale id must not pause it there.
      clearExamplePageId(deps.userKey)
      return 'failed'
    },

    selectShape(name) {
      deps.send(EnvelopeMessageType.TOUR_SELECT_SHAPE, { name })
    },

    // Convert, as the panel sees it: the model context's converted flag going
    // false -> true while the example page is current -- or on any page when
    // there is no example page (example-unavailable: the user converts a
    // diagram of their own).
    observeDiagram(emit) {
      emitters.add(emit)
      return () => { emitters.delete(emit) }
    },

    sync() {
      const converted = deps.getIsConverted()
      const flipped = !wasConverted && converted
      wasConverted = converted
      if (!flipped) return
      const example = readExamplePageId(deps.userKey)
      if (example !== null && deps.getCurrentPageId() !== example) return
      for (const emit of [...emitters]) emit('model.converted')
    },
  }
}
