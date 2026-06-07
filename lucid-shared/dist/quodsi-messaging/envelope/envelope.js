"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnvelope = void 0;
/**
 * Type guard to check if a value is a valid EnvelopeBase
 */
function isEnvelope(value) {
    if (!value || typeof value !== 'object')
        return false;
    var msg = value;
    return (typeof msg.id === 'string' && msg.id.length > 0 &&
        typeof msg.type === 'string' && msg.type.length > 0 &&
        typeof msg.source === 'string' &&
        (msg.source === 'host' || msg.source === 'model-iframe' || msg.source === 'auth-iframe' || msg.source === 'results-iframe' || msg.source === 'studio-embed-iframe') &&
        typeof msg.target === 'string' &&
        (msg.target === 'host' || msg.target === 'model-iframe' ||
            msg.target === 'auth-iframe' || msg.target === 'results-iframe' || msg.target === 'studio-embed-iframe' || msg.target === 'broadcast') &&
        msg.version === '1.0' &&
        msg.data !== undefined);
}
exports.isEnvelope = isEnvelope;
