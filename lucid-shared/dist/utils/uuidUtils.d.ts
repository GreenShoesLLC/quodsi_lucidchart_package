/**
 * UUID generation utility for Lucid extension environment
 *
 * This module provides UUID generation that works in the Lucid extension sandbox
 * where crypto.getRandomValues() may not be available. It gracefully falls back
 * to Math.random()-based generation when native crypto APIs are unavailable.
 */
/**
 * Generates a RFC4122 v4 compliant UUID
 *
 * Attempts to use native crypto.randomUUID() when available, falling back to
 * a Math.random()-based implementation that is compatible with restricted
 * sandbox environments like Lucid extensions.
 *
 * @returns A UUID string in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * ```typescript
 * const id = generateUUID();
 * console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export declare function generateUUID(): string;
/**
 * Generates a simple unique ID for message envelopes and temporary identifiers
 *
 * This is a lightweight alternative that combines timestamp with random string.
 * Suitable for short-lived IDs where full RFC4122 compliance is not required.
 *
 * @returns An ID string in the format: msg-{timestamp}-{random}
 *
 * @example
 * ```typescript
 * const msgId = generateSimpleId();
 * console.log(msgId); // "msg-1699123456789-a3f9k2x"
 * ```
 */
export declare function generateSimpleId(): string;
//# sourceMappingURL=uuidUtils.d.ts.map