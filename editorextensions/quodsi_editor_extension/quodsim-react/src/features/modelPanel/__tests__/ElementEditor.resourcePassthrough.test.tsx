// ElementEditor -> ResourceBlockEditor: the Resource block POINTER passthrough.
//
// `ElementEditor`'s `elementData` prop is `any`, and its Resource case reads
// `safeElementData.resourceId` off it by name. Nothing type-checks that name
// against what the extension actually sends -- so if the Resource selection
// payload ever renamed the field, every Resource block would silently render
// the ResourceLinkPicker forever ("this shape is not linked to a Resource
// yet") instead of the editor, with no error anywhere.
//
// This test pins the seam by rendering the REAL ElementEditor over the REAL
// shared Studio panels, feeding it the payload the extension's
// ResourceProcessor genuinely produces.
//
// PAYLOAD SOURCE (copied verbatim, do not "tidy"):
//   editorextensions/quodsi_editor_extension/src/core/messaging/handlers/
//     selection/processors/ResourceProcessor.ts
//   -> .../selection/utils/itemDataBuilder.ts  (buildModelItemData)
//   -> StorageAdapter.getElementData, which returns flattenEnvelope's
//      `{ ...domain, type, id }`. For a Resource block under storage format 2
//      the domain is just the pointer, so `data` is
//      `{ resourceId, type: 'Resource', id: <block id> }`.
//   The same shape is independently pinned extension-side by
//   editorextensions/quodsi_editor_extension/tests/messaging/
//     resourceSelectionPayload.test.ts.
//
// The `elementData` / `elementType` props are then derived exactly the way
// ModelPanel.tsx derives them from that payload (see ModelPanel.tsx ~line
// 334), so the whole extension -> panel -> ElementEditor -> ResourceBlockEditor
// chain of field names is under test, not just the last hop.
//
// The host is faked at the postMessage seam the same way
// features/editors/__tests__/ResourceBlockEditor.test.tsx fakes it: answer
// MODEL_ROOT_REQUEST with a MODEL_ROOT_SNAPSHOT.

import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { EnvelopeMessageType, SimulationObjectType, StateListManager } from '@quodsi/lucid-shared'
import { getSimulationObjectType } from '../../../utils/typeDetection'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}))

vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}))

import { ElementEditor } from '../ElementEditor'

type ResourceRow = { id: string; name: string; capacity?: number; shapeId?: string }

function installHost(resources: ResourceRow[]) {
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
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
  })
}

/** The ModelItemData a Resource-block selection carries -- see PAYLOAD SOURCE above. */
const resourceBlockPayload = {
  id: 'blk-1',
  data: { resourceId: 'r1', type: 'Resource', id: 'blk-1' },
  metadata: { type: SimulationObjectType.Resource, id: 'blk-1' },
  name: 'Nurse',
} as any

const baseProps = {
  onSave: vi.fn(),
  referenceData: {
    activities: [],
    generators: [],
    connectors: [],
    entities: [],
    states: [],
    resources: [],
    resourceRequirements: [],
  } as any,
  states: new StateListManager(),
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
}

describe('ElementEditor — Resource block pointer passthrough', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('feeds the payload pointer to ResourceBlockEditor, which mounts the shared ResourceEditor (not the picker)', async () => {
    installHost([{ id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'blk-1' }])

    const currentElement = resourceBlockPayload

    render(
      <ElementEditor
        {...baseProps}
        // Exactly ModelPanel.tsx's derivation.
        elementData={{ ...currentElement.data, id: currentElement.id }}
        elementType={getSimulationObjectType(
          currentElement.metadata?.type || (currentElement as any).type,
          currentElement,
          currentElement.data,
        )}
        currentElement={currentElement}
      />,
    )

    // The shared ResourceEditor's Basic-tab name input -- proof the pointer
    // survived every hop by the name each hop reads it under.
    expect(await screen.findByDisplayValue('Nurse')).toBeInTheDocument()
    // ...and NOT the ResourceLinkPicker's "not linked yet" prompt.
    expect(screen.queryByText(/not linked to a Resource yet/i)).not.toBeInTheDocument()
  })
})
