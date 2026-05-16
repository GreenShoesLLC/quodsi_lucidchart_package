// @quodsi/shared (pulled in by ConnectorsEditor.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen } from "@testing-library/react";
import ConnectorsEditor from "../ConnectorsEditor";

jest.mock("../../../messaging/senders", () => ({
  useModelOpsSender: () => ({ updateElementData: jest.fn() }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: jest.fn() }),
  useFlushOnChange: () => {},
}));

jest.mock("../RoutingConfigurationContent", () => ({
  RoutingConfigurationContent: () => <div data-testid="routing-config" />,
}));

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  activity: { id: "a1", name: "A" } as any,
  outgoingConnectors: [] as any,
  referenceData: {} as any,
  states: {} as any,
};

describe("ConnectorsEditor — hook order stable across invalid activity", () => {
  it("does not throw a Rules-of-Hooks error when activity becomes invalid on rerender", () => {
    // Valid first render: reaches the bottom, all hooks run.
    const { rerender } = render(<ConnectorsEditor {...baseProps} />);
    expect(screen.getByTestId("routing-config")).toBeInTheDocument();

    // Activity prop loses its id (e.g., selection cleared). Before the fix,
    // the early return fired before the hooks below — fewer hooks than the
    // prior render — crashing with "Rendered fewer hooks than expected."
    expect(() =>
      rerender(<ConnectorsEditor {...baseProps} activity={{} as any} />)
    ).not.toThrow();

    expect(
      screen.getByText(/Invalid routing configuration/i)
    ).toBeInTheDocument();
  });
});
