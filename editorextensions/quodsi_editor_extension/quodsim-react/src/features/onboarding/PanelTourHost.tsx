// quodsim-react/src/features/onboarding/PanelTourHost.tsx
//
// The side panel's tour host (spec 2026-10-16 L5, C2, C4, §9 amendment 1):
// Studio's shared PanelTourHost (spec 2026-11-18 §5.1) given Lucid's port.
// What stays here is Lucid's own: the envelopes to the extension
// (lucidTourPlatform.ts), its example-page store key, the run sender that
// opens the Studies modal, and the menu's TOUR_START.
import {
  EnvelopeMessageType,
  type EnvelopeBase,
  type TourShowExamplePageResultData,
  type TourStartData,
} from '@quodsi/lucid-shared'
import {
  PanelTourHost as SharedPanelTourHost,
  lucidCapacityTradeoff,
  type PanelTourHostProps as SharedPanelTourHostProps,
  type PanelTourPort,
} from 'quodsi_studio/platforms/shared'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { createLucidPanelPlatform, postToHost, requestFromHost } from './lucidTourPlatform'
import { lucidOwnership } from './examplePageStore'

export type PanelTourHostProps = Omit<SharedPanelTourHostProps, 'port'>

export function PanelTourHost(props: PanelTourHostProps) {
  const { openStudiesModal } = useSimulationRunSender()
  const { userKey, documentId, currentPageId } = props

  const port: PanelTourPort = {
    tour: lucidCapacityTradeoff,
    ownership: lucidOwnership,
    createPlatform: (deps) => createLucidPanelPlatform({
      ...deps,
      send: postToHost,
      request: requestFromHost,
      userKey,
    }),
    async showExamplePage() {
      const reply = (await requestFromHost(
        EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT,
      )) as TourShowExamplePageResultData | undefined
      if (reply?.outcome === 'shown') return reply.pageId
      if (reply?.outcome === 'missing') return null
      // Anything else is no answer: the host resumes where the user stands.
      throw new Error('TOUR_SHOW_EXAMPLE_PAGE: unrecognised reply')
    },
    openStudies: () => openStudiesModal(documentId ?? '', currentPageId ?? ''),
    // The extension menu's "Take the Quodsi tour".
    onStartRequest(cb) {
      const onMessage = (event: MessageEvent) => {
        const msg = event.data as EnvelopeBase | undefined
        if (msg?.type !== EnvelopeMessageType.TOUR_START) return
        cb({ reset: (msg.data as TourStartData | undefined)?.reset === true })
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    },
  }

  return <SharedPanelTourHost port={port} {...props} />
}
