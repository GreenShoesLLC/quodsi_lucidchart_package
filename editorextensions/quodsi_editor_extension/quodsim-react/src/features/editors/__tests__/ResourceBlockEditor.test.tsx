// ResourceBlockEditor: what a Resource BLOCK's selection renders now that a
// Resource block is a POINTER at a model-level resource rather than the
// record itself (Plan 2b).
//
// This suite deliberately renders the REAL shared Studio panels
// (ResourceEditor / ResourceLinkPicker) rather than stubbing them -- the
// whole point of the component under test is which of the two it picks and
// what it feeds them, and a stub would let a wrong accessor or a wrong
// resource id pass unnoticed.
//
// The host is faked at the postMessage seam, the same way
// adapters/__tests__/useModelRootSourceHook.test.tsx fakes it: answer
// MODEL_ROOT_REQUEST with a MODEL_ROOT_SNAPSHOT, and answer ELEMENT_UPDATE
// with a successful ELEMENT_UPDATE_RESULT. That keeps the real
// useModelRootSource / createLucidModelStateAccessor pair in the loop, so
// the linking assertion below is on the actual wire envelope the extension
// would receive -- not on a mock call.

import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}))

import { ResourceBlockEditor } from '../ResourceBlockEditor'

type ResourceRow = {
  id: string
  name: string
  capacity?: number
  shapeId?: string
  laneRef?: { blockId: string; laneId: string }
}

/**
 * Stands the fake host up on window.parent.postMessage and returns every
 * envelope the panel sent, in order.
 */
function installHost(resources: ResourceRow[]) {
  const sent: any[] = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    sent.push(envelope)
    if (envelope.type === EnvelopeMessageType.MODEL_ROOT_REQUEST) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              projection: {
                generators: [],
                arrivalPatterns: [],
                arrivalSchedules: [],
                resourceRequirements: [],
                resources,
                model: {},
              },
            },
          },
        }),
      )
    }
    if (envelope.type === EnvelopeMessageType.ELEMENT_UPDATE) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: { success: true },
          },
        }),
      )
    }
  })
  return sent
}

describe('ResourceBlockEditor', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the shared ResourceEditor for a linked block', async () => {
    installHost([{ id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'blk-1' }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="r1" />)

    // The Basic tab's name input -- proof the SHARED editor mounted against
    // the resource the pointer names, not against the block.
    expect(await screen.findByDisplayValue('Nurse')).toBeInTheDocument()
  })

  it('renders the picker for a dangling or absent pointer, and linking posts ELEMENT_UPDATE with the pointer', async () => {
    const sent = installHost([{ id: 'r9', name: 'Tech', capacity: 1 }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId={undefined} />)

    fireEvent.click(await screen.findByRole('button', { name: /Tech/ }))

    await waitFor(() => {
      expect(sent.some((e) => e.type === EnvelopeMessageType.ELEMENT_UPDATE)).toBe(true)
    })

    const update = sent.find((e) => e.type === EnvelopeMessageType.ELEMENT_UPDATE)
    // ONLY the pointer reaches the block -- no name, no capacity. Those live
    // on the model-level resource record now.
    expect(update.data).toEqual({
      elementId: 'blk-1',
      type: 'Resource',
      data: { resourceId: 'r9', id: 'blk-1' },
    })
  })

  it('renders the picker (not the shared editor) when the pointer is DANGLING', async () => {
    installHost([{ id: 'r9', name: 'Tech', capacity: 1 }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="gone" />)

    expect(await screen.findByRole('button', { name: /Tech/ })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Tech')).not.toBeInTheDocument()
    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument()
  })

  // Lucid copies shapeData wholesale on paste, so a pasted Resource block
  // carries the ORIGINAL's resourceId. resolveResourceLinks is first-wins:
  // the original keeps the row and stamps its `shapeId` on the projection,
  // the copy's claim is rejected. Resolving the pointer by existence alone
  // put the copy in the shared editor, so edits made "on the copy" silently
  // rewrote the record the original owns.
  it('a block whose resource is claimed by ANOTHER shape gets the notice and the picker, not the editor', async () => {
    installHost([
      { id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'other-blk' },
      { id: 'r9', name: 'Tech', capacity: 1 },
    ])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="r1" />)

    expect(
      await screen.findByText(/already represented by another shape/i),
    ).toBeInTheDocument()
    // The shared editor's name input must NOT be what renders -- that is the
    // surface that would have written through to the original's record.
    expect(screen.queryByDisplayValue('Nurse')).not.toBeInTheDocument()
    // ...and the picker is offered so the copy can take an unclaimed or new one.
    expect(screen.getByRole('button', { name: /Tech/ })).toBeInTheDocument()
  })

  it('a block whose resource is claimed by a LANE gets the notice too', async () => {
    installHost([
      { id: 'r1', name: 'Nurse', capacity: 2, laneRef: { blockId: 'sw-1', laneId: 'l0' } },
    ])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="r1" />)

    expect(
      await screen.findByText(/already represented by another shape/i),
    ).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Nurse')).not.toBeInTheDocument()
  })

  it('a block that OWNS the claim still gets the editor', async () => {
    installHost([{ id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'blk-1' }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="r1" />)

    expect(await screen.findByDisplayValue('Nurse')).toBeInTheDocument()
    expect(screen.queryByText(/already represented/i)).toBeNull()
  })

  it('an UNCLAIMED row still gets the editor -- the freshly-linked window before the next snapshot stamps the claim', async () => {
    installHost([{ id: 'r1', name: 'Nurse', capacity: 2 }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="r1" />)

    expect(await screen.findByDisplayValue('Nurse')).toBeInTheDocument()
    expect(screen.queryByText(/already represented/i)).toBeNull()
  })
})
