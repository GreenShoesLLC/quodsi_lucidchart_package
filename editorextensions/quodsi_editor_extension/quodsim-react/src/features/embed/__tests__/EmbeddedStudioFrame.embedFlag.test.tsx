// EmbeddedStudioFrame must join `embed=1` with `&` when studioPath already
// carries a query string (the Advisor route does), and with `?` otherwise.
// Studio's App.tsx keys embed mode off `embed=1`; a second `?` hides it.
import React from "react";
import { render } from "@testing-library/react";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ sendMessage: vi.fn() }),
}));

import { EmbeddedStudioFrame } from "../EmbeddedStudioFrame";

const ORIGIN = "https://studio.example";

function srcFor(path: string): string {
  const { container } = render(<EmbeddedStudioFrame studioPath={path} studioOrigin={ORIGIN} />);
  return container.querySelector("iframe")!.getAttribute("src")!;
}

describe("EmbeddedStudioFrame embed flag", () => {
  it("appends ?embed=1 to a bare path", () => {
    expect(srcFor("/embed/models/m1/studies")).toBe(`${ORIGIN}/embed/models/m1/studies?embed=1`);
  });

  it("appends &embed=1 when the path already has a query string", () => {
    expect(srcFor("/embed/advisor?focusType=Activity&focusId=a1")).toBe(
      `${ORIGIN}/embed/advisor?focusType=Activity&focusId=a1&embed=1`,
    );
  });
});
