import React from "react";
import { render, screen } from "@testing-library/react";
import ModelEditor from "../ModelEditor";
import { setView } from "quodsi_studio/platforms/shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// The tab body is covered end-to-end by EntitiesTab.projection.test.tsx; here
// we only pin that the Entities tab mounts the shared-editor wrapper.
vi.mock("../EntitiesTab", () => ({
  __esModule: true,
  default: () => <div data-testid="entities-tab" />,
  EntitiesTab: () => <div data-testid="entities-tab" />,
}));

const baseProps = {
  model: { id: "m1", name: "My Model", reps: 1, seed: 12345, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  entities: [],
};

describe("ModelEditor — Entities tab uses the shared editor", () => {
  // model.tab.entities is 'intermediate' in quodsi_shared/src/views/catalog.ts.
  beforeEach(() => setView("intermediate"));
  afterEach(() => setView("basic"));

  it("renders EntitiesTab on the entities tab", () => {
    render(<ModelEditor {...baseProps} referenceData={{} as any} activeTab="entities" />);
    expect(screen.getByTestId("entities-tab")).toBeInTheDocument();
  });
});
