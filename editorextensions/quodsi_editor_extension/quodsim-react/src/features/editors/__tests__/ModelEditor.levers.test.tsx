// Levers moved off the Basic/Settings tab onto their own (2026-08-31). The tab
// strip is icon-only, so `title` is the accessible name. Since 2026-09-12 the
// draft saves through the model-root accessor (real hooks here).
import React from "react";
import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { setView } from "quodsi_studio/platforms/shared";
import { mountModelEditor } from "./modelEditorSeam";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, selection: {}, sendMessage: vi.fn() }),
}));

const LEVERS_TAB_NAME = /mark .* as a scenario lever/i;

describe("ModelEditor — scenario lever authoring", () => {
  // model.tab.levers is intermediate as of 2026-09-03.
  beforeEach(() => setView("intermediate"));
  afterEach(() => { cleanup(); setView("basic"); });

  it("renders the lever-authoring section with the Model numeric properties", () => {
    mountModelEditor();
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    expect(screen.getByTestId("lever-authoring")).toBeInTheDocument();
    expect(screen.getByLabelText(/use Replications as a scenario lever/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/use Random Seed as a scenario lever/i)).toBeInTheDocument();
  });

  it("toggling a lever updates the draft and the badge, and saves the levers through the accessor", async () => {
    const { transport } = mountModelEditor();

    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));
    fireEvent.click(screen.getByLabelText(/use Replications as a scenario lever/i));

    expect((screen.getByLabelText(/use Replications as a scenario lever/i) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("tab-badge-levers")).toHaveTextContent("1");
    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1));
    expect((transport.send.mock.calls[0][0] as { levers: unknown[] }).levers).toHaveLength(1);
  });
});
