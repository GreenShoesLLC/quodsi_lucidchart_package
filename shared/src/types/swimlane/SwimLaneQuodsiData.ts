// shared/src/types/swimlane/SwimLaneQuodsiData.ts

/**
 * Inline Resource data stored within q_swimlane.
 * The swimlane block is the single persistence host for its lane Resources —
 * there are no separate blocks on the canvas for these Resources.
 * On model load, the loader reads q_swimlane and injects these into ModelDefinition.
 */
export interface SwimLaneResourceData {
  id: string;
  name: string;
  capacity: number;
  description: string;
  financialProperties?: {
    enabled: boolean;
    costPerSeize: number;
    costPerHourUtilized: number;
    costPerHourIdle: number;
  };
}

/**
 * Mapping between a swimlane lane (by index) and a simulation Resource.
 *
 * Lanes don't have stable IDs in the Lucid SDK — they're index-based and
 * created on-the-fly. We generate a UUID at mapping time and store a
 * `titleSnapshot` for reconciliation if lanes are reordered.
 */
export interface SwimLaneLaneMapping {
  /** Generated UUID for this lane mapping */
  laneId: string;
  /** Snapshot of the lane title at mapping time (for reconciliation) */
  titleSnapshot: string;
  /** Whether contained Activities auto-get resource requirements at serialization */
  assignmentMode: 'runtime-derive' | 'explicit';
  /** Full Resource data stored inline (the swimlane block is the sole persistence host) */
  resource: SwimLaneResourceData;
}

/**
 * Root object stored in the swimlane block's shapeData under the `q_swimlane` key.
 *
 * The `lanes` array is positional — index 0 corresponds to the first SDK lane,
 * index 1 to the second, etc. A `null` entry means the lane at that index
 * has not been mapped to a Resource yet.
 */
export interface SwimLaneQuodsiData {
  /** Positional array of lane mappings (null = unmapped) */
  lanes: (SwimLaneLaneMapping | null)[];
  /** ISO timestamp of last sync */
  lastSyncedAt: string;
}

/**
 * Describes which swimlane lane contains a given activity (if any).
 * Computed at selection time and passed to the React ActivityEditor
 * so it can display a read-only info banner.
 */
export interface SwimLaneContainment {
  swimlaneBlockId: string;
  laneIndex: number;
  laneName: string;
  resourceId: string;
  resourceName: string;
  assignmentMode: 'runtime-derive' | 'explicit';
}
