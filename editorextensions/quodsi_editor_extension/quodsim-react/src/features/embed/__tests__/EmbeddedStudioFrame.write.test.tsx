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
import { buildWriteEnvelope, WRITE_ID_TTL_MS, WRITE_RESULT_TYPES, writeTtlMs } from "../embedWriteEnvelope";

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
  it("maps a model write to ELEMENT_UPDATE on the page with no element-type hint", () => {
    expect(buildWriteEnvelope("model", { elementId: "page-1", patch: { replications: 5, name: "Clinic v2" } }, "id-7")).toEqual({
      id: "id-7", type: EnvelopeMessageType.ELEMENT_UPDATE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { elementId: "page-1", type: "Model", data: { replications: 5, name: "Clinic v2", id: "page-1" } },
    });
  });
  it("maps createShape to SHAPE_CREATE", () => {
    expect(buildWriteEnvelope("createShape", { type: "Activity", element: { name: "Triage" }, near: { elementId: "a1", side: "right" } }, "id-8")).toEqual({
      id: "id-8", type: EnvelopeMessageType.SHAPE_CREATE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { shapeType: "Activity", element: { name: "Triage" }, near: { elementId: "a1", side: "right" } },
    });
  });
  it("maps deleteShape to SHAPE_DELETE", () => {
    expect(buildWriteEnvelope("deleteShape", { type: "Connector", elementId: "c1" }, "id-9")).toEqual({
      id: "id-9", type: EnvelopeMessageType.SHAPE_DELETE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { shapeType: "Connector", elementId: "c1" },
    });
  });
  it("maps moveShape to SHAPE_MOVE", () => {
    expect(buildWriteEnvelope("moveShape", { elementId: "a1", x: 100, y: 200 }, "id-10")).toEqual({
      id: "id-10", type: EnvelopeMessageType.SHAPE_MOVE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { elementId: "a1", x: 100, y: 200 },
    });
  });
  it("maps createModel to MODEL_CREATE_PAGE", () => {
    const document = { activities: [], resources: [] };
    expect(buildWriteEnvelope("createModel", { document }, "id-11")).toEqual({
      id: "id-11", type: EnvelopeMessageType.MODEL_CREATE_PAGE, source: "studio-embed-iframe", target: "host", version: "1.0",
      data: { document },
    });
  });
  it("WRITE_RESULT_TYPES includes the four shape-op results", () => {
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_CREATE_RESULT)).toBe(true);
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_DELETE_RESULT)).toBe(true);
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_MOVE_RESULT)).toBe(true);
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT)).toBe(true);
  });
  it("writeTtlMs gives createModel a longer eviction window; everything else keeps WRITE_ID_TTL_MS", () => {
    expect(writeTtlMs("createModel")).toBe(65_000);
    expect(writeTtlMs("createShape")).toBe(WRITE_ID_TTL_MS);
    expect(writeTtlMs("deleteShape")).toBe(WRITE_ID_TTL_MS);
    expect(writeTtlMs("moveShape")).toBe(WRITE_ID_TTL_MS);
    expect(writeTtlMs("element")).toBe(WRITE_ID_TTL_MS);
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
    expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 7, success: true, error: undefined, data: { elementId: "a1" } }, ORIGIN);
  });

  it("relays a failure with the host's errorMessage", () => {
    const { iframe, iframePost } = mount();
    fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 8, kind: "modelRoot", payload: { patch: { states: [] } } });
    const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) as any;
    fromHost({ id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: false, errorMessage: "no persistence path" } });
    expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 8, success: false, error: "no persistence path", data: {} }, ORIGIN);
  });

  it("relays a createShape write's result, including the created id in data", () => {
    const { iframe, iframePost } = mount();
    fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 12, kind: "createShape", payload: { type: "Activity", element: { name: "Triage" } } });
    const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.SHAPE_CREATE) as any;
    expect(envelope).toMatchObject({ source: "studio-embed-iframe", target: "host", data: { shapeType: "Activity", element: { name: "Triage" } } });
    fromHost({ id: envelope.id, type: EnvelopeMessageType.SHAPE_CREATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: true, id: "new-a1" } });
    expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 12, success: true, error: undefined, data: { id: "new-a1" } }, ORIGIN);
  });

  it("gives a createModel write the longer eviction window instead of WRITE_ID_TTL_MS", () => {
    vi.useFakeTimers();
    try {
      const { iframe, iframePost } = mount();
      fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 13, kind: "createModel", payload: { document: { activities: [] } } });
      const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.MODEL_CREATE_PAGE) as any;
      // Still alive just past the ordinary WRITE_ID_TTL_MS window.
      act(() => { vi.advanceTimersByTime(WRITE_ID_TTL_MS + 1000); });
      fromHost({ id: envelope.id, type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: true, pageId: "p1" } });
      expect(iframePost).toHaveBeenCalledWith({ type: "QUODSI_EMBED_WRITE_RESULT", requestId: 13, success: true, error: undefined, data: { pageId: "p1" } }, ORIGIN);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fast-fails an unknown write kind instead of leaving the iframe to time out", () => {
    const { iframe, iframePost } = mount();
    fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 11, kind: "bogus", payload: {} });
    expect(iframePost).toHaveBeenCalledWith(
      { type: "QUODSI_EMBED_WRITE_RESULT", requestId: 11, success: false, error: "unknown write kind" },
      ORIGIN,
    );
    // No envelope (with the iframe as its `source`) was ever posted to the host.
    expect(parentPost).not.toHaveBeenCalledWith(expect.objectContaining({ source: "studio-embed-iframe" }), expect.anything());
  });

  it("ignores a result whose id it never issued", () => {
    const { iframePost } = mount();
    fromHost({ id: "someone-elses", type: EnvelopeMessageType.STATES_UPDATE_RESULT, source: "host", target: "model-iframe", version: "1.0", data: { success: true } });
    expect(iframePost).not.toHaveBeenCalledWith(expect.objectContaining({ type: "QUODSI_EMBED_WRITE_RESULT" }), expect.anything());
  });

  it("forgets an unanswered write after WRITE_ID_TTL_MS", () => {
    vi.useFakeTimers();
    try {
      const { iframe, iframePost } = mount();
      fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 9, kind: "states", payload: { states: [{ id: "s1" }] } });
      const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.STATES_UPDATE) as any;
      act(() => { vi.advanceTimersByTime(WRITE_ID_TTL_MS); });
      fromHost({ id: envelope.id, type: EnvelopeMessageType.STATES_UPDATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: true } });
      expect(iframePost).not.toHaveBeenCalledWith(expect.objectContaining({ type: "QUODSI_EMBED_WRITE_RESULT" }), expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it("a relayed result clears its timer", () => {
    vi.useFakeTimers();
    try {
      const { iframe, iframePost } = mount();
      fromIframe(iframe, { type: "QUODSI_EMBED_WRITE", requestId: 10, kind: "entities", payload: { entities: [{ id: "e1" }] } });
      const envelope = parentPost.mock.calls.map((c: any) => c[0]).find((m: any) => m?.type === EnvelopeMessageType.ENTITIES_UPDATE) as any;
      fromHost({ id: envelope.id, type: EnvelopeMessageType.ENTITIES_UPDATE_RESULT, source: "host", target: "studio-embed-iframe", version: "1.0", data: { success: true } });
      expect(iframePost).toHaveBeenCalledTimes(1);
      expect(() => { act(() => { vi.advanceTimersByTime(WRITE_ID_TTL_MS); }); }).not.toThrow();
      expect(iframePost).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
