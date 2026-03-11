export interface SwimLaneScanLaneBlock {
  id: string;
  className: string;
  text: string;
  hasQuodsiData: boolean;
  quodsiType: string | null;
}

export interface SwimLaneScanLane {
  index: number;
  title: string;
  size: number;
  boundingBox: { x: number; y: number; w: number; h: number };
  containedBlocks: SwimLaneScanLaneBlock[];
}

export interface SwimLaneScanItem {
  blockId: string;
  className: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  isVertical: boolean;
  isMagnetized: boolean;
  lanes: SwimLaneScanLane[];
}

export interface SwimLaneScanResult {
  swimlanes: SwimLaneScanItem[];
  nonSwimLaneBlocks: SwimLaneScanLaneBlock[];
  totalBlockCount: number;
}
