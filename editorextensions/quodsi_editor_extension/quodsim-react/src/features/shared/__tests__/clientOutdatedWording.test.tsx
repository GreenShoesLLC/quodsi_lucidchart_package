import React from "react";
import { render, screen, act } from "@testing-library/react";
import { LUCID_CLIENT_OUTDATED_MESSAGE } from "@quodsi/lucid-shared";
import {
  ClientOutdatedNotice,
  emitClientOutdated,
  quodsiClientHeaders,
  setQuodsiHost,
} from "quodsi_studio/platforms/shared";
import { applyLucidClientOutdatedWording } from "../clientOutdatedWording";

describe("Lucid out-of-date wording and host", () => {
  beforeEach(() => {
    applyLucidClientOutdatedWording();
    setQuodsiHost("lucid");
  });

  it("the notice says Lucid updates the extension, not 'Reload'", () => {
    render(<ClientOutdatedNotice />);
    act(() => emitClientOutdated({ code: "client_outdated" }));
    const text = screen.getByRole("alert").querySelector("span")!.textContent;
    expect(text).toBe(LUCID_CLIENT_OUTDATED_MESSAGE);
    expect(text).not.toContain("Reload");
  });

  it("requests name the lucid host", () => {
    expect(quodsiClientHeaders()["X-Quodsi-Host"]).toBe("lucid");
  });
});
