// utils/idUtils.ts
export const extractNumberFromId = (id: string): number => {
    const match = id.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
};

export const createActivityId = (number: number): string => {
    return `activity${number}`;
};

export const createResourceId = (number: number): string => {
    return `resource${number}`;
};

export const getNextActivityId = (existingIds: string[]): string => {
    const numbers = existingIds.map(extractNumberFromId);
    const maxNumber = Math.max(...numbers, 0);
    return createActivityId(maxNumber + 1);
};

export const getNextResourceId = (existingIds: string[]): string => {
    const numbers = existingIds.map(extractNumberFromId);
    const maxNumber = Math.max(...numbers, 0);
    return createResourceId(maxNumber + 1);
};