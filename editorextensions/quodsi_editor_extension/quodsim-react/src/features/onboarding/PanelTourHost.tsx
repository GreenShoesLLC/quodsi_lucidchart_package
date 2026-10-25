// quodsim-react/src/features/onboarding/PanelTourHost.tsx
//
// The side panel's tour host (spec 2026-10-16 L5, C2, C4, §9 amendment 1).
// The session itself is Studio's shared one; this decides when it runs here
// and renders the panel's own cards, top to bottom:
//
//   - the docked tour card (dockedRenderer.ts draws into it);
//   - the invitation, while no session runs;
//   - the handoff card, while the cursor sits on a Studies-modal step;
//   - the page-pause card, while the user is off the example page (C2).
//
// Lucid runs a second session in the Studies modal; the two hand the cursor
// over through localStorage (syncAcrossFrames). Dormancy is derived from the
// cursor the session reports (onCursor), not polled.
//
// The tour belongs to ONE Lucid document (final review ruling 7,
// examplePageStore.ts), while its cursor is shared by every document the user
// opens. So a mount only ever resumes a live cursor in the owning document,
// and does so without switching pages or building anything: the pause and
// handoff cards cover a user who is off the example page. A switch to the
// example page or a (re)build happens only from a click -- Start, Resume,
// Start over, Go to example page, Replace -- and a start click in another
// document adopts the tour there. A session whose document stops being the
// owner (another tab adopted the tour) stops, and the invitation returns.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EnvelopeMessageType,
  type EnvelopeBase,
  type TourShowExamplePageResultData,
  type TourStartData,
} from '@quodsi/lucid-shared'
import {
  InvitationCard,
  lucidCapacityTradeoff,
  readTourState,
  startTourSession,
  writeTourState,
  type TourSession,
} from 'quodsi_studio/platforms/shared'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { createLucidPanelPlatform, postToHost, requestFromHost, type LucidPanelPlatform } from './lucidTourPlatform'
import {
  EXAMPLE_PAGE_STORAGE_KEY,
  adoptTourDocument,
  clearExamplePageId,
  readExamplePageId,
  readTourOwner,
  writeExamplePage,
} from './examplePageStore'
import { ownsPanel } from './stepFrames'

const TOUR = lucidCapacityTradeoff
const LOAD_EXAMPLE = 'load-example'
const LOAD_EXAMPLE_INDEX = TOUR.steps.findIndex((s) => s.id === LOAD_EXAMPLE)

/** Steps after the example exists: only these depend on its page. */
function isPastLoadExample(stepId: string | undefined): boolean {
  if (stepId === undefined) return false
  return TOUR.steps.findIndex((s) => s.id === stepId) > LOAD_EXAMPLE_INDEX
}

type StartOptions = { fromBeginning: boolean; reset?: boolean }

const CARD = 'm-2 p-3 rounded border border-border bg-surface text-sm space-y-2'
const PRIMARY_BUTTON = 'px-3 py-1 rounded bg-accent text-surface font-medium'

export type PanelTourHostProps = {
  /** The signed-in user's email: tour state and the example page are per user.
   *  '' until auth resolves: nothing starts and storage is not read, but a
   *  TOUR_START is still heard and buffered. */
  userKey: string
  authStatus: 'loading' | 'signed-in' | 'signed-out'
  /** The current page is a Quodsi model (the panel's model context). */
  isConverted: boolean
  currentPageId: string | undefined
  /** The panel's document: the tour runs only in the one that owns it, and
   *  the handoff card launches Studies for it. */
  documentId?: string
}

export function PanelTourHost({ userKey, authStatus, isConverted, currentPageId, documentId }: PanelTourHostProps) {
  const { openStudiesModal } = useSimulationRunSender()
  const dockRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<TourSession | null>(null)
  const platformRef = useRef<LucidPanelPlatform | null>(null)
  // Bumped by every stop, so an async start (or a stale session's callback)
  // that was overtaken does nothing.
  const generationRef = useRef(0)
  const suspendedRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  // Which session the page-pause effect last saw: a new session must be
  // suspended too when the user is already off the example page.
  const [sessionSeq, setSessionSeq] = useState(0)

  // The platform reads these when the session asks, not when it was made.
  const convertedRef = useRef(isConverted)
  convertedRef.current = isConverted
  const pageRef = useRef(currentPageId)
  pageRef.current = currentPageId
  const documentRef = useRef(documentId)
  documentRef.current = documentId
  const authRef = useRef({ authStatus, userKey })
  authRef.current = { authStatus, userKey }
  // A TOUR_START that arrived before sign-in resolved; honoured once it does.
  const pendingStartRef = useRef<StartOptions | null>(null)
  // The user + document a mount-time resume was last decided for: decided
  // once, when both are known, not again on every render.
  const autoResumeKeyRef = useRef<string | null>(null)

  const stopSession = useCallback(() => {
    generationRef.current += 1
    sessionRef.current?.stop()
    sessionRef.current = null
    platformRef.current = null
    suspendedRef.current = false
    // The stopped session's own running(false) is dropped by the generation
    // guard below, so say it here; and an overtaken start never clears it.
    setRunning(false)
    setStarting(false)
  }, [])

  /** Another document owns the tour now (a click there adopted it). */
  const ownerLost = useCallback((): boolean => {
    const owner = readTourOwner(userKey)
    const doc = documentRef.current
    return owner !== null && doc !== undefined && owner.documentId !== doc
  }, [userKey])

  /**
   * `explicit`: a click (or the menu's TOUR_START), which is consent to move
   * the tour here -- this document adopts it, and a resume past load-example
   * first brings the example page on screen, rebuilding it if it is gone (C4).
   * A mount-time resume is not explicit and does neither.
   */
  const start = useCallback(async (opts: StartOptions, explicit: boolean) => {
    stopSession()
    const gen = generationRef.current
    setStarting(true)
    try {
      const doc = documentRef.current
      if (explicit && doc) adoptTourDocument(userKey, doc)
      if (explicit && !opts.fromBeginning && !opts.reset) {
        const saved = readTourState(userKey, TOUR.id)
        if (saved.state === 'started' && isPastLoadExample(saved.currentStepId)) {
          let reply: TourShowExamplePageResultData | undefined
          try {
            reply = (await requestFromHost(
              EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT,
            )) as TourShowExamplePageResultData
          } catch {
            reply = undefined // No answer: resume where the user stands.
          }
          if (gen !== generationRef.current) return
          if (reply?.outcome === 'missing') {
            clearExamplePageId(userKey)
            writeTourState(userKey, TOUR.id, {
              state: 'started', currentStepId: LOAD_EXAMPLE, lastActionAt: new Date().toISOString(),
            })
          } else if (reply?.outcome === 'shown' && doc) {
            writeExamplePage(userKey, doc, reply.pageId)
          }
        }
      }
      const container = dockRef.current
      if (gen !== generationRef.current || !container) return
      const platform = createLucidPanelPlatform({
        send: postToHost,
        request: requestFromHost,
        container,
        getIsConverted: () => convertedRef.current,
        getCurrentPageId: () => pageRef.current,
        getDocumentId: () => documentRef.current,
        userKey,
      })
      platformRef.current = platform
      sessionRef.current = startTourSession({
        tour: TOUR,
        userKey,
        platform,
        fromBeginning: opts.fromBeginning,
        reset: opts.reset,
        syncAcrossFrames: true,
        onRunningChange: (r) => { if (gen === generationRef.current) setRunning(r) },
        onCursor: (s) => {
          if (gen !== generationRef.current) return
          setCursor(s.currentStepId)
          // A synced cursor may come from a tab that has since adopted the
          // tour. Deferred: this can run inside the machine's own render.
          if (ownerLost()) queueMicrotask(() => { if (gen === generationRef.current) stopSession() })
        },
      })
      setSessionSeq((n) => n + 1)
    } finally {
      if (gen === generationRef.current) setStarting(false)
    }
  }, [userKey, stopSession, ownerLost])

  // Sign-in: honour a queued TOUR_START. Signing out (or unmounting) stops
  // the session, and a later sign-in decides the mount-time resume again.
  useEffect(() => {
    if (authStatus !== 'signed-in' || !userKey) return
    const pending = pendingStartRef.current
    pendingStartRef.current = null
    if (pending) void start(pending, true)
    return () => {
      autoResumeKeyRef.current = null
      stopSession()
    }
  }, [authStatus, userKey, start, stopSession])

  // Mount-time resume, once the user and the document are both known: only
  // a live cursor (a × pause is offered by the invitation instead), only in
  // the owning document, and never at load-example, whose entry would build
  // the example page.
  useEffect(() => {
    if (authStatus !== 'signed-in' || !userKey || !documentId) return
    const key = `${userKey}\n${documentId}`
    if (autoResumeKeyRef.current === key) return
    autoResumeKeyRef.current = key
    if (sessionRef.current) return
    const saved = readTourState(userKey, TOUR.id)
    if (saved.state !== 'started' || saved.paused || saved.currentStepId === LOAD_EXAMPLE) return
    if (readTourOwner(userKey)?.documentId !== documentId) return
    void start({ fromBeginning: false }, false)
  }, [authStatus, userKey, documentId, start])

  // Another tab adopting the tour writes the owner record: stop here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== EXAMPLE_PAGE_STORAGE_KEY && e.key !== null) return
      if (sessionRef.current && ownerLost()) stopSession()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [ownerLost, stopSession])

  // The extension menu's "Take the Quodsi tour".
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase | undefined
      if (msg?.type !== EnvelopeMessageType.TOUR_START) return
      const reset = (msg.data as TourStartData | undefined)?.reset === true
      const opts: StartOptions = { fromBeginning: true, reset }
      const { authStatus: a, userKey: u } = authRef.current
      if (a === 'signed-in' && u) void start(opts, true)
      else pendingStartRef.current = opts
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [start])

  // Convert is observed through the model context the panel already holds.
  useEffect(() => {
    platformRef.current?.sync()
  }, [isConverted, currentPageId])

  const owned = cursor !== undefined && ownsPanel(cursor)
  const dormant = running && cursor !== undefined && !owned
  const examplePageId = userKey ? readExamplePageId(userKey) : null
  // C2: the user is on another page than the tour's example.
  const offPage = running && isPastLoadExample(cursor) &&
    examplePageId !== null && currentPageId !== undefined && currentPageId !== examplePageId
  // Only an owned step has a machine to suspend; a dormant one runs nothing.
  const offExamplePage = owned && offPage
  // Off the example page the pause card replaces the handoff card too: its
  // Open What-if would launch Studies for the page the user is on, and the
  // modal would walk run-baseline on the wrong model.
  const showPause = offPage
  const showHandoff = dormant && !offPage

  // C2: off the example page the session is suspended (no card, no timers,
  // cursor kept) and resumed once the example page is current again.
  useEffect(() => {
    const s = sessionRef.current
    if (!s) return
    if (offExamplePage && !suspendedRef.current) {
      suspendedRef.current = true
      s.suspend()
    } else if (!offExamplePage && suspendedRef.current) {
      suspendedRef.current = false
      s.resume()
    }
  }, [offExamplePage, sessionSeq])

  const goToExamplePage = useCallback(async () => {
    const gen = generationRef.current
    let reply: TourShowExamplePageResultData | undefined
    try {
      reply = (await requestFromHost(
        EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT,
      )) as TourShowExamplePageResultData
    } catch {
      return
    }
    if (gen !== generationRef.current) return
    const doc = documentRef.current
    if (reply?.outcome === 'shown') {
      if (doc) writeExamplePage(userKey, doc, reply.pageId)
    } else if (reply?.outcome === 'missing') {
      // The example page was deleted mid-tour: build it again (C4).
      clearExamplePageId(userKey)
      writeTourState(userKey, TOUR.id, {
        state: 'started', currentStepId: LOAD_EXAMPLE, lastActionAt: new Date().toISOString(),
      })
      void start({ fromBeginning: false }, true)
    }
  }, [userKey, start])

  // The pause card's ×, the same exit as the docked card's: the cursor is
  // kept and marked paused (which also stops the modal's session), and the
  // invitation offers Resume or Start over. Without it a user whose example
  // page is gone could only rebuild it (smoke 2026-10-25).
  const exitTour = useCallback(() => {
    const saved = readTourState(userKey, TOUR.id)
    if (saved.state === 'started') {
      writeTourState(userKey, TOUR.id, { ...saved, paused: true, lastActionAt: new Date().toISOString() })
    }
    stopSession()
  }, [userKey, stopSession])

  return (
    <div data-testid="panel-tour-host" className="flex-none">
      <div ref={dockRef} data-testid="tour-dock" />
      {userKey && !running && !starting && (
        <div className="m-2">
          <InvitationCard tour={TOUR} userKey={userKey} authStatus={authStatus}
                          onStart={(o) => { void start(o, true) }} />
        </div>
      )}
      {showHandoff && (
        <div className={CARD} data-testid="tour-handoff">
          <p className="m-0">The tour continues in What-if Analysis.</p>
          <button type="button" className={PRIMARY_BUTTON}
                  onClick={() => openStudiesModal(documentId ?? '', currentPageId ?? '')}>
            Open What-if Analysis
          </button>
        </div>
      )}
      {showPause && (
        <div className={CARD} data-testid="tour-page-pause">
          <div className="flex items-start gap-2">
            <p className="m-0 flex-1">Go back to the example page to continue the tour.</p>
            <button type="button" className="px-1 leading-none text-muted"
                    aria-label="Exit tour (you can resume later)" onClick={exitTour}>
              ×
            </button>
          </div>
          <button type="button" className={PRIMARY_BUTTON} onClick={() => { void goToExamplePage() }}>
            Go to example page
          </button>
        </div>
      )}
    </div>
  )
}
