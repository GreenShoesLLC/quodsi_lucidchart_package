// Type to ensure we only accept enum types
type EnumType = { [key: string]: string | number };

export class EnumMapper<T extends EnumType> {
    private enumType: T;
    private stringToEnumMap: Map<string, T[keyof T]>;
    private enumToStringMap: Map<T[keyof T], string>;

    constructor(enumType: T) {
        this.enumType = enumType;
        this.stringToEnumMap = new Map();
        this.enumToStringMap = new Map();
        this.initializeMaps();
    }

    private initializeMaps(): void {
        // Create bidirectional mappings for enum values
        Object.entries(this.enumType)
            .filter(([key]) => isNaN(Number(key))) // Filter out reverse mappings
            .forEach(([key, value]) => {
                const enumValue = value as T[keyof T];
                this.stringToEnumMap.set(key, enumValue);
                this.enumToStringMap.set(enumValue, key);
            });
    }

    public toString(enumValue: T[keyof T]): string {
        const stringValue = this.enumToStringMap.get(enumValue);
        if (stringValue === undefined) {
            throw new Error(`Invalid enum value: ${enumValue}`);
        }
        return stringValue;
    }

    public toEnum(stringValue: string): T[keyof T] {
        const enumValue = this.stringToEnumMap.get(stringValue);
        if (enumValue === undefined) {
            throw new Error(`Invalid string value: ${stringValue}`);
        }
        return enumValue;
    }

    public isValidEnumValue(value: T[keyof T]): boolean {
        return this.enumToStringMap.has(value);
    }

    public isValidStringValue(value: string): boolean {
        return this.stringToEnumMap.has(value);
    }

    public getAllValidStrings(): string[] {
        return Array.from(this.stringToEnumMap.keys());
    }

    public getAllValidEnumValues(): T[keyof T][] {
        return Array.from(this.enumToStringMap.keys());
    }
}
