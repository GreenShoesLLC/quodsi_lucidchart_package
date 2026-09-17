/**
 * A plain JSON object -- the shape of an element's stored data as the panel
 * receives it (ModelItemData.data) and sends it back.
 */
export type JsonObject = { [key: string]: JsonValue };

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
