export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonSerializable[];
export type JsonObject = {
    [key: string]: JsonSerializable;
};
export type JsonSerializable = JsonPrimitive | JsonObject | JsonArray;
//# sourceMappingURL=JsonTypes.d.ts.map