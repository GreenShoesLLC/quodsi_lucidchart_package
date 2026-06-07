// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
// We only use a type + a constant here, so stub it. Must precede the import.
jest.mock("axios", () => ({}));

import { getModalSizePref, setModalSizePref } from "../modalSizePref";

describe("modalSizePref", () => {
  beforeEach(() => localStorage.clear());

  it("returns the default (xlarge) when nothing is stored", () => {
    expect(getModalSizePref()).toBe("xlarge");
  });

  it("round-trips a valid value", () => {
    setModalSizePref("large");
    expect(getModalSizePref()).toBe("large");
    setModalSizePref("fullscreen");
    expect(getModalSizePref()).toBe("fullscreen");
  });

  it("falls back to the default for an invalid stored value", () => {
    localStorage.setItem("quodsi_modal_size", "ginormous");
    expect(getModalSizePref()).toBe("xlarge");
  });
});
