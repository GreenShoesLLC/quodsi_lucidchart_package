import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GeneratorEditor from "../GeneratorEditor";
import { setView } from "quodsi_studio/platforms/shared";

// This file predates Complexity Views and exercises the shared
// ConnectorRoutingView's State Condition / Entity Template modes, both
// 'intermediate' in the catalog. Pin the view for every test here rather
// than weaken any assertion -- view-gating itself is covered by
// viewGating.test.tsx / Studio's own viewFieldGating.test.tsx.
beforeEach(() => setView("intermediate"));
afterEach(() => setView("basic"));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// GeneratorEditor calls useModelRootSource() directly, which needs
// useMessaging() for its panelType -- mocked the same way
// GeneratorEditor.pattern.test.tsx / GeneratorEditor.levers.test.tsx do.
// `hooks/useEditorState` is deliberately NOT mocked here (unlike those two
// files): this suite exercises the real useAutoSave/useFlushOnChange path
// so a routing-mode change actually reaches onSave.
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

const referenceData = {
  activities: [],
  generators: [{ id: 'gen-1', name: 'Door', routing: 'probability' }],
  connectors: [
    { id: 'c1', sourceId: 'gen-1', targetId: 'a2', weight: 1 },
    { id: 'c2', sourceId: 'gen-1', targetId: 'a3', weight: 1 },
  ],
  entities: [],
  states: [],
  resources: [],
  resourceRequirements: [],
} as any

const generator = { id: 'gen-1', name: 'Door', routing: 'probability', levers: [] } as any

// The tab button is icon-only; its accessible name comes from the `title`
// attribute, which is TAB_CONFIG's `tooltip` field (see GeneratorEditor.tsx's
// TAB_CONFIG.map render), matching the exact tooltip text the brief specifies.
const ROUTING_TAB_NAME = /choose how entities pick a target/i

describe('GeneratorEditor — Routing tab renders the shared ConnectorRoutingView', () => {
  it('Routing tab renders the shared view with four modes and both connectors', async () => {
    const user = userEvent.setup()
    render(<GeneratorEditor generator={generator} onSave={vi.fn()} states={{} as any} onStatesChange={vi.fn()} referenceData={referenceData} />)
    const tab = screen.getByRole('button', { name: ROUTING_TAB_NAME })
    expect(tab).toBeInTheDocument()
    await user.click(tab)
    const select = screen.getByRole('combobox') // the view's mode select -- only one <select> renders in Probability mode
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Probability', 'State Condition', 'Entity Template', 'First Available'])
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
    expect(screen.getByTestId('connector-routing-card-c2')).toBeInTheDocument()
  })

  it('choosing First Available flows through the editor draft to onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<GeneratorEditor generator={generator} onSave={onSave} states={{} as any} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    await user.selectOptions(screen.getByRole('combobox'), 'first_available')
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls.at(-1)![0].routing).toBe('first_available')
  })
})
