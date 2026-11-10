// The ?view=expression modal's view (spec 2026-11-10): nothing until the
// host's INIT, then the shared builder full-size, answering one RESULT.
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { ComponentType, StateOperation, StateType, type ExpressionBuilderRequest } from '@quodsi/shared'

const h = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: h.sendMessage }),
}))

import { ExpressionBuilderView } from '../ExpressionBuilderView'

const request: ExpressionBuilderRequest = {
  expression: 'StateB + 1',
  target: { name: 'StateA', dataType: StateType.NUMBER, operation: StateOperation.ASSIGN },
  states: [{ name: 'StateB', dataType: StateType.NUMBER, componentType: ComponentType.ENTITY, initialValue: 12 }],
}

function deliverInit(requestId = 'r1', req: ExpressionBuilderRequest = request) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        id: 'host-1', type: EnvelopeMessageType.EXPRESSION_BUILDER_INIT,
        source: 'host', target: 'expression-iframe', version: '1.0',
        data: { requestId, request: req },
      },
    }))
  })
}

const results = () =>
  h.sendMessage.mock.calls.filter(([type]) => type === EnvelopeMessageType.EXPRESSION_BUILDER_RESULT)

beforeEach(() => h.sendMessage.mockClear())
afterEach(() => cleanup())

describe('ExpressionBuilderView', () => {
  it('renders the builder from INIT and sends RESULT on Use', () => {
    render(<ExpressionBuilderView />)
    expect(screen.queryByRole('button', { name: 'Use expression' })).toBeNull()

    deliverInit()
    expect(screen.getByLabelText('Expression being built')).toHaveValue('StateB + 1')

    fireEvent.click(screen.getByRole('button', { name: 'Use expression' }))
    // A second click (the modal is closing) sends nothing more.
    fireEvent.click(screen.getByRole('button', { name: 'Use expression' }))
    expect(results()).toEqual([
      [EnvelopeMessageType.EXPRESSION_BUILDER_RESULT, { requestId: 'r1', expression: 'StateB + 1' }],
    ])
  })

  it('sends null on Cancel', () => {
    render(<ExpressionBuilderView />)
    deliverInit()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(results()).toEqual([
      [EnvelopeMessageType.EXPRESSION_BUILDER_RESULT, { requestId: 'r1', expression: null }],
    ])
  })

  it('ignores a repeated INIT', () => {
    render(<ExpressionBuilderView />)
    deliverInit()
    deliverInit('r2', { ...request, expression: 'StateB' })
    expect(screen.getByLabelText('Expression being built')).toHaveValue('StateB + 1')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(results()[0][1]).toEqual({ requestId: 'r1', expression: null })
  })
})
