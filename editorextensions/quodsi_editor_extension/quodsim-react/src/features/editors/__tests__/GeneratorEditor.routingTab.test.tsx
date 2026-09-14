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

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// GeneratorEditor calls useModelRootSource() directly, which needs
// useMessaging() for its panelType -- mocked the same way
// GeneratorEditor.pattern.test.tsx / GeneratorEditor.levers.test.tsx do.
// `hooks/useEditorState` is deliberately NOT mocked here (unlike those two
// files): this suite exercises the real useAutoSave/useFlushOnChange path
// so a routing-mode change actually reaches accessor.updateShape.
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

// The editor now saves through the model-root source's batched shape queue
// (spec 2026-09-13 lucid-shape-writes §3), not a plain onSave prop. This fake
// source stands in for useModelRootSource so the test can assert on the
// patch handed to accessor.updateShape. `projection: null` keeps the editor
// drafting from the test's own `generator` fixture (extractGeneratorData
// falls back to `generator` when no snapshot record exists).
const { modelRoot } = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const snapshot = { modelDefinition: null, saveStatus: "idle" as const, saveError: null };
  return {
    modelRoot: {
      accessor: {
        subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
        getSnapshot: () => snapshot,
        updateShape: vi.fn(async (_id: string, _type: string, _patch: Record<string, unknown>) => {}),
        updateModel: vi.fn(async () => {}),
        flushModelImmediate: vi.fn(async () => {}),
      },
      projection: null,
      request: () => {},
    },
  };
});

vi.mock("../../../adapters/useModelRootSource", () => ({
  useModelRootSource: () => modelRoot,
  MODEL_ROOT_DEBOUNCE_MS: 400,
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
  beforeEach(() => {
    modelRoot.accessor.updateShape.mockClear();
  });

  it('Routing tab renders the shared view with four modes and both connectors', async () => {
    const user = userEvent.setup()
    render(<GeneratorEditor generator={generator} states={{} as any} referenceData={referenceData} />)
    const tab = screen.getByRole('button', { name: ROUTING_TAB_NAME })
    expect(tab).toBeInTheDocument()
    await user.click(tab)
    const select = screen.getByRole('combobox') // the view's mode select -- only one <select> renders in Probability mode
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Probability', 'State Condition', 'Entity Template', 'First Available'])
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
    expect(screen.getByTestId('connector-routing-card-c2')).toBeInTheDocument()
  })

  it('choosing First Available flows through the editor draft to the model-root source', async () => {
    const user = userEvent.setup()
    render(<GeneratorEditor generator={generator} states={{} as any} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    await user.selectOptions(screen.getByRole('combobox'), 'first_available')
    await waitFor(() => expect(modelRoot.accessor.updateShape).toHaveBeenCalled())
    const call = modelRoot.accessor.updateShape.mock.calls.at(-1)
    expect(call).toBeDefined()
    expect((call![2] as Record<string, unknown>).routing).toBe('first_available')
  })
})
