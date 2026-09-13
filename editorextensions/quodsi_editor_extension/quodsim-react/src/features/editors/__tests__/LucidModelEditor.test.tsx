// The Lucid host for Studio's shared ModelEditor (spec 2026-09-13 §1): the real
// projection, source and accessor over the seam; only messaging and the two
// senders are faked.
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EnvelopeMessageType, ValidationSeverity } from '@quodsi/lucid-shared'
import type { ValidationResult } from '@quodsi/lucid-shared'
import { setView } from 'quodsi_studio/platforms/shared'

const messaging = vi.hoisted(() => ({ current: {} as any }))
const senders = vi.hoisted(() => ({ locateElement: vi.fn(), openSettingsModal: vi.fn() }))

vi.mock('../../../messaging/MessageProvider', () => ({ useMessaging: () => messaging.current }))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({ locateElement: senders.locateElement }),
}))
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openSettingsModal: senders.openSettingsModal }),
}))

import { LucidModelEditor } from '../LucidModelEditor'
import { definition, modelRootSeam } from './modelEditorSeam'

function result(issues: Array<Record<string, unknown>>): ValidationResult {
  return {
    isValid: issues.length === 0,
    issues: issues.map((issue, n) => ({
      id: `i${n}`,
      severity: ValidationSeverity.ERROR,
      message: `Issue ${n}`,
      ...issue,
    })),
    summary: { errorCount: issues.length, warningCount: 0, infoCount: 0 },
  } as ValidationResult
}

function mount(props: Partial<React.ComponentProps<typeof LucidModelEditor>> = {}, def = definition()) {
  const seam = modelRootSeam(def)
  return { ...seam, ...render(<LucidModelEditor accessor={seam.accessor} {...props} />) }
}

beforeEach(() => {
  messaging.current = {
    app: { panelType: 'model' },
    selection: {},
    sendMessage: vi.fn(),
    entitlements: { replicationsPerScenarioLimit: null },
  }
  senders.locateElement.mockClear()
  senders.openSettingsModal.mockClear()
})

afterEach(() => {
  cleanup()
  setView('basic')
})

describe('LucidModelEditor', () => {
  it("renders the shared editor's header with the model name, and its text tabs", () => {
    mount()

    expect(screen.getByRole('heading', { level: 2, name: 'My Model' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Basic' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Validation' })).toBeInTheDocument()
  })

  it("shows the extension's blocker count in the header, and no badge before the first result", () => {
    const first = mount({ validationState: null })
    expect(screen.queryByRole('button', { name: /^Validation: / })).toBeNull()
    first.unmount()

    mount({ validationState: result([{ code: 'no_outgoing_connectors', elementId: 'act-1' }]) })
    expect(screen.getByRole('button', { name: 'Validation: 1 blocker' })).toBeInTheDocument()
  })

  it('Go to source on a shape issue sends LOCATE_ELEMENT for that element', () => {
    mount({ activeTab: 'Validation', validationState: result([{ code: 'no_outgoing_connectors', elementId: 'act-1' }]) })

    fireEvent.click(screen.getByRole('button', { name: 'Go to source' }))

    expect(senders.locateElement).toHaveBeenCalledWith('act-1')
  })

  it('Go to source on a model-level issue opens Basic and locates nothing', () => {
    const onTabChange = vi.fn()
    mount({ activeTab: 'Validation', onTabChange, validationState: result([{ code: 'missing_finish_datetime' }]) })

    fireEvent.click(screen.getByRole('button', { name: 'Go to source' }))

    expect(onTabChange).toHaveBeenCalledWith('Basic')
    expect(senders.locateElement).not.toHaveBeenCalled()
  })

  it("warns under Replications above the plan's limit, and not at the limit", () => {
    setView('intermediate')
    messaging.current.entitlements = { replicationsPerScenarioLimit: 5 }
    const first = mount()
    fireEvent.click(screen.getByRole('button', { name: /advanced settings/i }))
    expect(screen.getByText(/Your plan allows up to 5 replications per run/)).toBeInTheDocument()
    first.unmount()

    // definition() stores 10 replications.
    messaging.current.entitlements = { replicationsPerScenarioLimit: 10 }
    mount()
    fireEvent.click(screen.getByRole('button', { name: /advanced settings/i }))
    expect(screen.queryByText(/Your plan allows up to/)).toBeNull()
  })

  it('hands work-schedule editing to the Lucid modal', () => {
    setView('advanced')
    mount({ activeTab: 'Schedules' })

    fireEvent.click(screen.getByRole('button', { name: /new schedule/i }))

    expect(messaging.current.sendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      { scheduleId: expect.any(String) },
    )
  })

  it("opens Lucid's Settings modal from a hidden-but-in-use notice", () => {
    setView('basic')
    mount({}, definition({ resources: [{ id: 'r1', name: 'Nurse' }] }))

    fireEvent.click(screen.getByRole('button', { name: /^Switch to / }))

    expect(senders.openSettingsModal).toHaveBeenCalledTimes(1)
  })
})
