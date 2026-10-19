// quodsim-react/src/features/onboarding/ModalTourHost.tsx
//
// The Studies modal's tour host (spec 2026-10-16 §5.1, C3, §9 amendment 1).
// The side panel runs the tour up to open-studies; this frame runs the rest,
// with the same shared session and the cursor handed over through
// localStorage (syncAcrossFrames). It renders nothing itself: the Zag overlay
// draws over the modal.
//
// When it runs: only on a live cursor (started and not paused by ×). Before
// that it listens for the other frame's writes and starts the moment one
// arrives; once started, the session handles sync, × and the finish itself.
// A completed or skipped tour drops the session so a later start from the
// panel is picked up again.
//
// Mount it inside the modal's QueryClientProvider: the session's run observer
// must watch the modal's own queries (C3 — re-entry at wait-baseline with the
// run already finished advances on the first terminal read).
//
// Close = unmount: the session stops without touching the cursor, and the
// panel shows its handoff card.
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createZagRenderer,
  lucidCapacityTradeoff,
  readTourState,
  startTourSession,
  type TourPlatform,
  type TourSession,
} from 'quodsi_studio/platforms/shared'
import { ownsModal } from './stepFrames'

const TOUR = lucidCapacityTradeoff
/** storage.ts's key; the storage event names the key that changed. */
const STORAGE_KEY = 'quodsi.onboarding.v1'

const platform: TourPlatform = {
  createRenderer: () => createZagRenderer(),
  ownsStep: ownsModal,
  // Never reached: load-example (and its asks) belong to the panel.
  loadExample: async () => 'failed',
  // The editor walk is the panel's too; nothing here selects shapes.
  selectShape: () => {},
}

export type ModalTourHostProps = {
  /** The signed-in user's email, identical to the panel's: the two frames
   *  share one stored cursor only under the same key. '' = not known yet. */
  userKey: string
}

export function ModalTourHost({ userKey }: ModalTourHostProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userKey) return
    let session: TourSession | null = null
    let disposed = false

    const drop = (): void => {
      session?.stop()
      session = null
    }

    const startIfLive = (): void => {
      if (disposed || session) return
      const saved = readTourState(userKey, TOUR.id)
      if (saved.state !== 'started' || saved.paused) return
      const mine: TourSession = startTourSession({
        tour: TOUR,
        userKey,
        platform,
        queryClient,
        fromBeginning: false,
        syncAcrossFrames: true,
        onCursor: (s) => {
          // Finished (here, or synced from the panel): let go, so a new run
          // of the tour is picked up by the listener below. Deferred: this
          // can run inside the machine's own render.
          if (s.state === 'completed' || s.state === 'skipped') {
            queueMicrotask(() => { if (session === mine) drop() })
          }
        },
      })
      session = mine
    }

    const onStorage = (e: StorageEvent): void => {
      if (e.key !== STORAGE_KEY && e.key !== null) return
      startIfLive()
    }

    window.addEventListener('storage', onStorage)
    startIfLive()
    return () => {
      disposed = true
      window.removeEventListener('storage', onStorage)
      drop()
    }
  }, [userKey, queryClient])

  return null
}
