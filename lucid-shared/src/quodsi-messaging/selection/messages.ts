/**
 * Basic shape information for diagram elements
 */
export interface ElementShape {
  /** Element ID in Lucid */
  id: string;

  /** Element type in Lucid */
  type: string;

  /** Text content */
  text?: string;

  /** X coordinate */
  x?: number;

  /** Y coordinate */
  y?: number;

  /** Width */
  width?: number;

  /** Height */
  height?: number;
}
