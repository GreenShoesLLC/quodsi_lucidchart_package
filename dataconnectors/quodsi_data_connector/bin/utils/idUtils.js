"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextResourceId = exports.getNextActivityId = exports.createResourceId = exports.createActivityId = exports.extractNumberFromId = void 0;
// utils/idUtils.ts
const extractNumberFromId = (id) => {
    const match = id.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
};
exports.extractNumberFromId = extractNumberFromId;
const createActivityId = (number) => {
    return `activity${number}`;
};
exports.createActivityId = createActivityId;
const createResourceId = (number) => {
    return `resource${number}`;
};
exports.createResourceId = createResourceId;
const getNextActivityId = (existingIds) => {
    const numbers = existingIds.map(exports.extractNumberFromId);
    const maxNumber = Math.max(...numbers, 0);
    return (0, exports.createActivityId)(maxNumber + 1);
};
exports.getNextActivityId = getNextActivityId;
const getNextResourceId = (existingIds) => {
    const numbers = existingIds.map(exports.extractNumberFromId);
    const maxNumber = Math.max(...numbers, 0);
    return (0, exports.createResourceId)(maxNumber + 1);
};
exports.getNextResourceId = getNextResourceId;
