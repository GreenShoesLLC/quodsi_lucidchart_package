import { isString, isNumber } from "lucid-extension-sdk";
import { LotNode, Statuses } from "@quodsi/shared/src/types/constants";
export declare const isCar: (subject: unknown) => subject is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
    id: typeof isString;
    type: typeof isString;
    make: typeof isString;
    model: typeof isString;
    color: typeof isString;
    miles: typeof isNumber;
    status: (x: unknown) => x is {} extends typeof Statuses ? never : Statuses;
    lot: typeof isString;
    manufacturedDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
    lastServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
    nextServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
}>;
export declare const isCarArray: (p1: unknown) => p1 is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
    id: typeof isString;
    type: typeof isString;
    make: typeof isString;
    model: typeof isString;
    color: typeof isString;
    miles: typeof isNumber;
    status: (x: unknown) => x is {} extends typeof Statuses ? never : Statuses;
    lot: typeof isString;
    manufacturedDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
    lastServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
    nextServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        ms: typeof isNumber;
        isDateOnly: (x: unknown) => x is boolean | undefined;
    }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        isoDate: typeof isString;
        displayTimezone: (x: unknown) => x is string | null | undefined;
    }>;
}>[];
export declare const isLot: (subject: unknown) => subject is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
    address: typeof isString;
    image: typeof isString;
}>;
export declare const isLotArray: (p1: unknown) => p1 is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
    address: typeof isString;
    image: typeof isString;
}>[];
export declare const isLotNode: (subject: unknown) => subject is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
    lot: (subject: unknown) => subject is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        address: typeof isString;
        image: typeof isString;
    }>;
    cars: (p1: unknown) => p1 is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
        id: typeof isString;
        type: typeof isString;
        make: typeof isString;
        model: typeof isString;
        color: typeof isString;
        miles: typeof isNumber;
        status: (x: unknown) => x is {} extends typeof Statuses ? never : Statuses;
        lot: typeof isString;
        manufacturedDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            ms: typeof isNumber;
            isDateOnly: (x: unknown) => x is boolean | undefined;
        }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            isoDate: typeof isString;
            displayTimezone: (x: unknown) => x is string | null | undefined;
        }>;
        lastServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            ms: typeof isNumber;
            isDateOnly: (x: unknown) => x is boolean | undefined;
        }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            isoDate: typeof isString;
            displayTimezone: (x: unknown) => x is string | null | undefined;
        }>;
        nextServiceDate: (x: unknown) => x is import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            ms: typeof isNumber;
            isDateOnly: (x: unknown) => x is boolean | undefined;
        }> | import("lucid-extension-sdk").DestructureGuardedTypeObj<{
            isoDate: typeof isString;
            displayTimezone: (x: unknown) => x is string | null | undefined;
        }>;
    }>[];
}>;
export declare function isLotNodeArray(value: unknown): value is LotNode[];
//# sourceMappingURL=validators.d.ts.map