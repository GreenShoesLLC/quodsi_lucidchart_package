// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/SaveStatusLine.test.tsx
import { render, screen } from "@testing-library/react";
import SaveStatusLine from "../SaveStatusLine";

describe("SaveStatusLine", () => {
  it("renders 'Saved' for status='saved'", () => {
    render(<SaveStatusLine status="saved" lastSavedAt={null} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("renders 'Saving…' for status='saving'", () => {
    render(<SaveStatusLine status="saving" lastSavedAt={null} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("renders 'Fix errors to save' for status='invalid'", () => {
    render(<SaveStatusLine status="invalid" lastSavedAt={null} />);
    expect(screen.getByText(/Fix errors to save/i)).toBeInTheDocument();
  });

  it("renders 'Save failed' for status='error'", () => {
    render(<SaveStatusLine status="error" lastSavedAt={null} />);
    expect(screen.getByText(/Save failed/i)).toBeInTheDocument();
  });
});
