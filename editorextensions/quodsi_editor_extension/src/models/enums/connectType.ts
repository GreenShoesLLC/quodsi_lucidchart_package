// connectType.ts
export enum ConnectType {
    Probability = "Probability",
    AttributeValue = "AttributeValue"
}

export class ConnectTypeUtils {
    static stringToConnectRule(inputStr: string): ConnectType {
        // Normalize the input string to lower case to make the matching case-insensitive
        const normalizedStr = inputStr.toLowerCase();

        // Define a mapping of string representations to ConnectType values
        const stringToEnumMapping: { [key: string]: ConnectType } = {
            "percentage": ConnectType.Probability,
            "attributevalue": ConnectType.AttributeValue
        };

        // Look up the normalized string in the mapping and return the corresponding ConnectType value
        // If the input string doesn't match any key in the mapping, throw an Error
        if (normalizedStr in stringToEnumMapping) {
            return stringToEnumMapping[normalizedStr];
        } else {
            throw new Error(`Unknown ConnectType: '${inputStr}'`);
        }
    }
}