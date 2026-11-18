// The Studies modal's wrapper: the shared WindowTourHost's own tests cover the
// host; this pins the port Lucid hands it (tour, store, which steps it owns).
import { render } from '@testing-library/react'
import type { WindowTourPort } from 'quodsi_studio/platforms/shared'

let captured: WindowTourPort | null = null
let capturedProps: Record<string, unknown> = {}

vi.mock('quodsi_studio/platforms/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('quodsi_studio/platforms/shared')>()
  return {
    ...actual,
    WindowTourHost: ({ port, ...rest }: { port: WindowTourPort } & Record<string, unknown>) => {
      captured = port
      capturedProps = rest
      return null
    },
  }
})

import { lucidCapacityTradeoff } from 'quodsi_studio/platforms/shared'
import { ModalTourHost } from '../ModalTourHost'
import { lucidOwnership } from '../examplePageStore'

describe('ModalTourHost (Lucid wrapper)', () => {
  beforeEach(() => {
    captured = null
    capturedProps = {}
    render(<ModalTourHost userKey="ann@example.com" documentId="doc-1" />)
  })

  it("hands the shared host Lucid's tour and Lucid's example-page store", () => {
    expect(captured).not.toBeNull()
    expect(captured!.tour).toBe(lucidCapacityTradeoff)
    expect(captured!.ownership).toBe(lucidOwnership)
    expect(captured!.ownership.storageKey).toBe('quodsi.onboarding.lucid.examplePage.v2')
  })

  it('passes its props through', () => {
    expect(capturedProps).toEqual({ userKey: 'ann@example.com', documentId: 'doc-1' })
  })

  it('owns the Studies steps, not the panel steps', () => {
    const platform = captured!.createPlatform()
    expect(platform.ownsStep?.('welcome')).toBe(false)
    expect(platform.ownsStep?.('open-studies')).toBe(false)
    expect(platform.ownsStep?.('run-baseline')).toBe(true)
    expect(platform.ownsStep?.('aha')).toBe(true)
  })

  it('never loads the example or selects shapes (the panel does both)', async () => {
    const platform = captured!.createPlatform()
    await expect(platform.loadExample({ replace: false })).resolves.toBe('failed')
    expect(() => platform.selectShape('ID Check')).not.toThrow()
  })
})
