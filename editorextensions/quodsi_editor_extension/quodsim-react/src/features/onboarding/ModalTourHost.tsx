// quodsim-react/src/features/onboarding/ModalTourHost.tsx
//
// The Studies modal's tour host (spec 2026-10-16 §5.1, C3, §9 amendment 1):
// Studio's shared WindowTourHost (spec 2026-11-18 §5.1) given Lucid's port --
// Lucid's tour, its example-page store and the Zag overlay over the modal.
// The side panel runs the tour up to open-studies; this frame runs the rest.
//
// Mount it inside the modal's QueryClientProvider: the session's run observer
// must watch the modal's own queries (C3).
import {
  WindowTourHost,
  createZagRenderer,
  lucidCapacityTradeoff,
  type WindowTourHostProps,
  type WindowTourPort,
} from 'quodsi_studio/platforms/shared'
import { lucidOwnership } from './examplePageStore'
import { ownsModal } from './lucidTourPlatform'

const port: WindowTourPort = {
  tour: lucidCapacityTradeoff,
  ownership: lucidOwnership,
  createPlatform: () => ({
    createRenderer: () => createZagRenderer(),
    ownsStep: ownsModal,
    // Never reached: load-example (and its asks) belong to the panel.
    loadExample: async () => 'failed',
    // The editor walk is the panel's too; nothing here selects shapes.
    selectShape: () => {},
  }),
}

export type ModalTourHostProps = Omit<WindowTourHostProps, 'port'>

export function ModalTourHost(props: ModalTourHostProps) {
  return <WindowTourHost port={port} {...props} />
}
