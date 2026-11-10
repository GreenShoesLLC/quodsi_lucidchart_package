// The Lucid Activity, Generator and Connector editors hand the shared editors
// the expression builder bridge (spec 2026-11-10), so the state-change
// dialog's "Build expression…" opens the builder over the canvas.
import React from 'react'
import { render, cleanup } from '@testing-library/react'

const h = vi.hoisted(() => ({
  props: {} as Record<string, any>,
  bridge: vi.fn(),
}))

vi.mock('quodsi_studio/platforms/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quodsi_studio/platforms/shared')>()),
  ActivityEditor: (props: any) => { h.props.activity = props; return null },
  GeneratorEditor: (props: any) => { h.props.generator = props; return null },
  ConnectorEditor: (props: any) => { h.props.connector = props; return null },
}))
vi.mock('../../expressionBuilder/useExpressionBuilderBridge', () => ({
  useExpressionBuilderBridge: () => h.bridge,
}))
vi.mock('../../../adapters/useElementEditorAccessor', () => ({
  useElementEditorAccessor: () => ({ accessor: {}, projection: { pageId: 'page-1' } }),
}))
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: vi.fn() }),
}))
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({
    openPatternModal: vi.fn(), openScheduleModal: vi.fn(), openSettingsModal: vi.fn(),
  }),
}))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({ selectElement: vi.fn() }),
}))

import { LucidActivityEditor } from '../LucidActivityEditor'
import { LucidGeneratorEditor } from '../LucidGeneratorEditor'
import { LucidConnectorEditor } from '../LucidConnectorEditor'

afterEach(() => { cleanup(); h.props = {} })

describe('expression builder wiring', () => {
  it('passes the bridge to the shared Activity, Generator and Connector editors', () => {
    render(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)
    render(<LucidGeneratorEditor shapeId="g1" referenceData={undefined} />)
    render(<LucidConnectorEditor shapeId="c1" referenceData={undefined} />)

    expect(h.props.activity.onOpenExpressionBuilder).toBe(h.bridge)
    expect(h.props.generator.onOpenExpressionBuilder).toBe(h.bridge)
    expect(h.props.connector.onOpenExpressionBuilder).toBe(h.bridge)
  })
})
