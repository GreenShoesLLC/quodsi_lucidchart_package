// Define JSON serializable types for messaging
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonSerializable[];
export type JsonObject = { [key: string]: JsonSerializable };
export type JsonSerializable = JsonPrimitive | JsonObject | JsonArray;
