// editorextensions/quodsi_editor_extension/tests/helpers/fakeProxies.ts
type ShapeData = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};

function makeShapeData(): ShapeData {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k),
    set: (k, v) => { m.set(k, v); },
    delete: (k) => { m.delete(k); },
  };
}

export type FakeBox = { x: number; y: number; w: number; h: number };

export type FakeBlockOptions = {
  className?: string;          // e.g. 'AdvancedSwimLaneBlock'
  box?: FakeBox;               // getBoundingBox()
  lanes?: string[];            // lane titles; makes getPrimaryLanes() return one fake lane per title
  text?: string;               // block text, for name pickers
};

export function makeFakeBlock(id: string, opts: FakeBlockOptions = {}) {
  const box: FakeBox = opts.box ?? { x: 0, y: 0, w: 100, h: 60 };
  const lanes = (opts.lanes ?? []).map((title, index) => ({
    index,
    getTitle: () => title,
    getBoundingBox: () => ({ x: box.x, y: box.y + index * 100, w: box.w, h: 100 }),
  }));
  const block: any = {
    id,
    shapeData: makeShapeData(),
    getClassName: () => opts.className ?? 'ProcessBlock',
    getBoundingBox: () => ({ ...box }),
    getPrimaryLanes: () => lanes,
    textAreas: new Map<string, string>(opts.text !== undefined ? [['Text', opts.text]] : []),
    page: null as any,
    getPage: () => block.page,
  };
  return block;
}

export type FakeEndpoint = { x?: number; y?: number; connection?: { id: string } };

export type FakeLineOptions = {
  /** What the line is ACTUALLY attached to on the canvas right now.
   *  `connection` left out means a detached endpoint -- which is exactly
   *  what LineProxy reports for a dangling end. */
  endpoint1?: FakeEndpoint;
  endpoint2?: FakeEndpoint;
  text?: string;               // line label, for name pickers
};

export function makeFakeLine(id: string, opts: FakeLineOptions = {}) {
  const endpoint = (e: FakeEndpoint | undefined) => ({
    x: e?.x ?? 0,
    y: e?.y ?? 0,
    connection: e?.connection,
  });
  const line: any = {
    id,
    shapeData: makeShapeData(),
    getEndpoint1: () => endpoint(opts.endpoint1),
    getEndpoint2: () => endpoint(opts.endpoint2),
    textAreas: new Map<string, string>(opts.text !== undefined ? [['Text', opts.text]] : []),
    page: null as any,
    getPage: () => line.page,
  };
  return line;
}

export function makeFakePage(id: string) {
  const page: any = {
    id,
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => id,
  };
  return page;
}

/** Adds a block to a page and back-links block.page. */
export function addBlock(page: any, block: any): any {
  block.page = page;
  page.allBlocks.set(block.id, block);
  return block;
}

/** Adds a line to a page and back-links line.page -- mirrors `addBlock`. */
export function addLine(page: any, line: any): any {
  line.page = page;
  page.allLines.set(line.id, line);
  return line;
}
