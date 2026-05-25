jest.mock("../../messaging/MessageContext", () => ({
  useAuth: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAuth } from "../../messaging/MessageContext";
import { useOpenInStudio } from "./useOpenInStudio";

const mockedUseAuth = useAuth as jest.Mock;

function Harness({ path }: { path: string }) {
  const { available, open } = useOpenInStudio();
  return (
    <div>
      <span data-testid="available">{String(available)}</span>
      <button onClick={() => open(path)}>go</button>
    </div>
  );
}

describe("useOpenInStudio", () => {
  let openSpy: jest.SpyInstance;
  beforeEach(() => {
    openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    openSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("opens the Studio URL in a new tab", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      config: { studioBaseUrl: "https://dev-studio.quodsi.com" },
    });
    render(<Harness path="/animation/scn-1" />);
    expect(screen.getByTestId("available").textContent).toBe("true");
    fireEvent.click(screen.getByText("go"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://dev-studio.quodsi.com/animation/scn-1",
      "_blank",
      "noopener",
    );
  });

  it("strips a trailing slash on the base URL", () => {
    mockedUseAuth.mockReturnValue({
      config: { studioBaseUrl: "https://dev-studio.quodsi.com/" },
    });
    render(<Harness path="/animation/scn-1" />);
    fireEvent.click(screen.getByText("go"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://dev-studio.quodsi.com/animation/scn-1",
      "_blank",
      "noopener",
    );
  });

  it("is unavailable and a no-op when no studioBaseUrl", () => {
    mockedUseAuth.mockReturnValue({ config: undefined });
    render(<Harness path="/animation/scn-1" />);
    expect(screen.getByTestId("available").textContent).toBe("false");
    fireEvent.click(screen.getByText("go"));
    expect(openSpy).not.toHaveBeenCalled();
  });
});
