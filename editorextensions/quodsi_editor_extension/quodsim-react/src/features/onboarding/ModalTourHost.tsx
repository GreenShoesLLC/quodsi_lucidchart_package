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
// Only in the document that owns the tour (final review ruling 7,
// examplePageStore.ts): the cursor is shared by every document the user
// opens, so a modal over any other document (or with no owner recorded yet)
// neither starts nor follows it, and a running session stops as soon as
// another document adopts the tour.
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
  TOUR_STORAGE_KEY,
  createZagRenderer,
  lucidCapacityTradeoff,
  readTourState,
  startTourSession,
  type TourPlatform,
  type TourSession,
} from 'quodsi_studio/platforms/shared'
import { EXAMPLE_PAGE_STORAGE_KEY, readTourOwner } from './examplePageStore'
import { ownsModal } from './stepFrames'

const TOUR = lucidCapacityTradeoff

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
  /** The document the modal opened over (its URL's documentId). Absent:
   *  the tour is never picked up here. */
  documentId?: string
}

export function ModalTourHost({ userKey, documentId }: ModalTourHostProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userKey || !documentId) return
    let session: TourSession | null = null
    let disposed = false

    const drop = (): void => {
      session?.stop()
      session = null
    }

    const owned = (): boolean => readTourOwner(userKey)?.documentId === documentId

    const startIfLive = (): void => {
      if (disposed || session || !owned()) return
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
          // Finished (here, or synced from the panel), or adopted by another
          // document: let go, so a new run of the tour here is picked up by
          // the listener below. Deferred: this can run inside the machine's
          // own render.
          if (s.state === 'completed' || s.state === 'skipped' || !owned()) {
            queueMicrotask(() => { if (session === mine) drop() })
          }
        },
      })
      session = mine
    }

    const onStorage = (e: StorageEvent): void => {
      if (e.key !== TOUR_STORAGE_KEY && e.key !== EXAMPLE_PAGE_STORAGE_KEY && e.key !== null) return
      if (session && !owned()) drop()
      else startIfLive()
    }

    window.addEventListener('storage', onStorage)
    startIfLive()
    return () => {
      disposed = true
      window.removeEventListener('storage', onStorage)
      drop()
    }
  }, [userKey, documentId, queryClient])

  return null
}
