// Write relay (Advisor write half): the iframe's QUODSI_EMBED_WRITE becomes
// the extension's own write envelope with a fresh correlation id, and the
// host's *_RESULT with that id comes back into the iframe as
// QUODSI_EMBED_WRITE_RESULT carrying the iframe's requestId.
import React from "react";
import { render, act } from "@testing-library/react";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ sendMessage: vi.fn() }),
}));

import { EmbeddedStudioFrame } from "../EmbeddedStudioFrame";
import { buildWriteEnvelope } from "../embedWriteEnvelope";

const ORIGIN = "https://studio.example";

/** Message from the iframe: jsdom ignores `source` in the constructor, so define it. */
function fromIframe(iframe: HTMLIFrameElement, data: unknown) {
  const ev = new MessageEvent("message", { data, origin: ORIGIN });
  Object.defineProperty(ev, "source", { value: iframe.contentWindow, configurable: true });
  act(() => { window.dispatchEvent(ev); });
}
function fromHost(data: unknown) {
  const ev = new MessageEvent("message", { data });
  Object.defineProperty(ev, "source", { value: window, configurable: true });
  act(() => { window.dispatchEvent(ev); });
}

describe("buildWriteEnvelope", () => {
  it("maps each kind to the extension envelope, with the line/block hint for elements", () => {
    expect(buildWriteEnvelope("element", { elementId: "c1", type: "Connector", patch: { weight: 2 } }, "id-1")).toEqual({
      id: "id-1", type: EnvelopeMessageType.ELEMENT_UPDATE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { elementId: "c1", type: "Connector", data: { weight: 2, id: "c1" }, diagramElementType: "line" },
    });
    expect(buildWriteEnvelope("element", { elementId: "a1", type: "Activity", patch: { capacity: 2 } }, "id-2")?.data)
      .toMatchObject({ diagramElementType: "block", data: { capacity: 2, id: "a1" } });
    expect(buildWriteEnvelope("modelRoot", { patch: { resources: [] } }, "id-3")).toMatchObject({
      type: EnvelopeMessageType.MODEL_ROOT_UPDATE, data: { patch: { resources: [] } },
    });
    expect(buildWriteEnvelope("states", { states: [{ id: "s1" }] }, "id-4")).toMatchObject({
      type: EnvelopeMessageType.STATES_UPDATE, data: { states: [{ id: "s1" }] },
    });
    expect(buildWriteEnvelope("entities", { entities: [{ id: "e1" }] }, "id-5")).toMatchObject({
      type: EnvelopeMessageType.ENTITIES_UPDATE, data: { entities: [{ id: "e1" }] },
    });
  });
  it("returns null for an unknown kind", () => {
    expect(buildWriteEnvelope("bogus" as any, {} as any, "id-6")).toBeNull();
  });
});

describe("EmbeddedStudioFrame write relay", () => {
  let parentPost: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { parentPost = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());

  function mount() {
    const { container } = render(<EmbeddedStudioFrame studioPath="/embed/advisor?focusType=Model" studioOrigin={ORIGIN} />);
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const iframePost = vi.fn();
    Object.defineProperty(iframe, "contentWindow", { value: { postMessage: iframePost }, configurable: true });
    return { iframe, iframePost };
  }

  it("forwards a write as the extension envelope and relays the matching result by id", () => {
    const { iframe, iframePost } = mount();
    fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 7, kind: "element", payload: { elementId: "a1", type: "Activity", patch: { capacity: 2 } } });
    const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.ELEMENT_UPDATE) as any;
    expect(envelope).toMatchObject({ source: "studio-embed-iframe", target: "host", data: { elementId: "a1", diagramElementType: "block" } });
    expect(typeof envelope.id).toBe("string");

    fromHost({ id: envelope.id, type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: true, elementId: "a1" } });
    expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 7, success: true, error: undefined }, ORIGIN);
  });

  it("relays a failure with the host's errorMessage", () => {
    const { iframe, iframePost } = mount();
    fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 8, kind: "modelRoot", payload: { patch: { states: [] } } });
    const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) as any;
    fromHost({ id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: false, errorMessage: "no persistence path" } });
    expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 8, success: false, error: "no persistence path" }, ORIGIN);
  });

  it("ignores a result whose id it never issued", () => {
    const { iframePost } = mount();
    fromHost({ id: "someone-elses", type: EnvelopeMessageType.STATES_UPDATE_RESULT, source: "host", target: "model-iframe", version: "1.0", data: { success: true } });
    expect(iframePost).not.toHaveBeenCalledWith(expect.objectContaining({ type: "QUODSI_EMBED_WRITE_RESULT" }), expect.anything());
  });
});
