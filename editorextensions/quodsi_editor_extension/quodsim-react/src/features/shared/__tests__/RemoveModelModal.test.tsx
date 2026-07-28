// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RemoveModelModal } from "../RemoveModelModal";

describe("RemoveModelModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <RemoveModelModal isOpen={false} onClose={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names what is lost, including the unrecoverable results", () => {
    // The API purges result blobs for good (lucid_router.RemoveModel ->
    // ModelStore.delete_container). A vague "are you sure" would understate it.
    render(<RemoveModelModal isOpen={true} onClose={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByText(/studies and scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation results, permanently/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("confirms only when the destructive button is pressed", () => {
    const onConfirm = jest.fn();
    render(<RemoveModelModal isOpen={true} onClose={jest.fn()} onConfirm={onConfirm} />);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove Model" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancelling closes without confirming", () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<RemoveModelModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("the X and the backdrop dismiss without confirming", () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { container } = render(
      <RemoveModelModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByTitle("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop = the outermost element; clicking the panel itself must NOT close.
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
