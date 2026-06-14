// @quodsi/lucid-shared (pulled in by ResourceEditor.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ConnectorsEditor.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ResourceEditor from "../ResourceEditor";

jest.mock("../../../messaging/senders", () => ({
  useModelOpsSender: () => ({ updateElementData: jest.fn() }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

// onSave is captured by useAutoSave; mock it so the basic-tab draft mutation is
// observable without timer plumbing (the onSave-timing path is the human smoke,
// Task 6). We still assert the section renders + the checkbox toggles the draft.
jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: jest.fn() }),
  useFlushOnChange: () => {},
}));

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  resource: { id: "r1", name: "Nurse", capacity: 3, levers: [] } as any,
  onSave: jest.fn(),
  states: {} as any,
  onStatesChange: jest.fn(),
  referenceData: {} as any,
};

describe("ResourceEditor — scenario lever authoring", () => {
  it("renders the lever-authoring section in the basic tab", () => {
    render(<ResourceEditor {...baseProps} />);
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/use Capacity as a scenario lever/i)
    ).toBeInTheDocument();
  });

  it("toggling the Capacity lever checkbox updates the visible draft (checkbox becomes checked, label appears)", () => {
    render(<ResourceEditor {...baseProps} />);
    const checkbox = screen.getByLabelText(
      /use Capacity as a scenario lever/i
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(
      (screen.getByLabelText(/use Capacity as a scenario lever/i) as HTMLInputElement)
        .checked
    ).toBe(true);
    // the lever label input (defaulted to "Component — Property") is now visible
    expect(screen.getByLabelText(/lever label/i)).toHaveValue("Nurse — Capacity");
  });
});
