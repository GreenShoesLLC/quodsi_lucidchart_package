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

export function makeFakeLine(id: string) {
  return { id, shapeData: makeShapeData() } as any;
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
