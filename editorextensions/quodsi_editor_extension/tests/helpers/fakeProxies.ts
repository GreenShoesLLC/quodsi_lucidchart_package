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

export function makeFakeBlock(id: string) {
  return { id, shapeData: makeShapeData() } as any;
}
export function makeFakeLine(id: string) {
  return { id, shapeData: makeShapeData() } as any;
}
export function makeFakePage(id: string) {
  return { id, shapeData: makeShapeData(), allBlocks: new Map(), allLines: new Map() } as any;
}
