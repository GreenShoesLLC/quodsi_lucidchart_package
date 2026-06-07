type EnumType = {
    [key: string]: string | number;
};
export declare class EnumMapper<T extends EnumType> {
    private enumType;
    private stringToEnumMap;
    private enumToStringMap;
    constructor(enumType: T);
    private initializeMaps;
    toString(enumValue: T[keyof T]): string;
    toEnum(stringValue: string): T[keyof T];
    isValidEnumValue(value: T[keyof T]): boolean;
    isValidStringValue(value: string): boolean;
    getAllValidStrings(): string[];
    getAllValidEnumValues(): T[keyof T][];
}
export {};
//# sourceMappingURL=EnumMapper.d.ts.map