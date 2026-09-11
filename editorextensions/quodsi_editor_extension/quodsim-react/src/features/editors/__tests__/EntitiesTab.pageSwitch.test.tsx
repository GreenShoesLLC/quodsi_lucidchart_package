// quodsim-react/src/features/editors/__tests__/EntitiesTab.pageSwitch.test.tsx
//
// PAGE SWITCH (final fix wave I2): useModelRootSource requests a snapshot
// only on mount, ModelPanel keeps `activeTab` across a Lucid page switch, and
// ModelEditor is not keyed -- so with the Entities tab open, switching Lucid
// pages left page A's projection mounted. An Add/Delete then sent page A's
// whole `entities` list to the host, which wrote it against the CURRENT page
// B; updateEntities treated every one of B's real entities as deleted and
// cascaded their references.
//
// This test mocks useMessaging (for a controllable page id) and
// useModelRootSource (instrumented with a useState initializer, which only
// re-runs on a genuine new component mount -- not a re-render of the same
// instance) to prove EntitiesTab remounts its model-root-source consumer
// whenever the current page id changes, and does NOT remount on an
// unrelated re-render.

import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useState } from 'react'

let currentPageId: string | undefined = 'page-a'
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ selection: { documentContext: { pageId: currentPageId } } }),
}))

let mountCount = 0
vi.mock('../../../adapters/useModelRootSource', () => ({
  useModelRootSource: () => {
    // The initializer form of useState runs exactly once per component
    // instance (on mount), never again on a re-render of that SAME instance
    // -- so this counts genuine remounts, not renders.
    useState(() => {
      mountCount += 1
      return mountCount
    })
    return { accessor: {}, projection: null }
  },
}))

import EntitiesTab from '../EntitiesTab'

describe('EntitiesTab remounts its model-root-source consumer on a page switch', () => {
  beforeEach(() => {
    cleanup()
    currentPageId = 'page-a'
    mountCount = 0
  })

  it('mounts a fresh useModelRootSource consumer when the current page id changes', () => {
    const { rerender } = render(<EntitiesTab />)
    expect(mountCount).toBe(1)

    currentPageId = 'page-b'
    rerender(<EntitiesTab />)

    expect(mountCount).toBe(2)
  })

  it('does not remount when the page id is unchanged', () => {
    const { rerender } = render(<EntitiesTab />)
    expect(mountCount).toBe(1)

    rerender(<EntitiesTab />)

    expect(mountCount).toBe(1)
  })
})
