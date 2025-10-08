/**
 * Connect type enumeration for routing logic.
 *
 * Defines how entities are routed through connectors in the simulation.
 */
export enum ConnectType {
    /**
     * Probability-based routing.
     * Entities are routed based on connector probability values.
     */
    Probability = "Probability",

    /**
     * State condition routing.
     * Entities are routed based on state value conditions.
     * Requires a StateCondition to be defined on the connector.
     */
    StateCondition = "StateCondition",

    /**
     * Entity template routing.
     * Entities are routed based on their entity template type.
     * Requires an entityTemplateUniqueId to be defined on the connector.
     */
    EntityTemplate = "EntityTemplate",

    /**
     * @deprecated Use StateCondition instead
     */
    AttributeValue = "AttributeValue"
}

export class ConnectTypeUtils {
    static stringToConnectRule(inputStr: string): ConnectType {
        // Normalize the input string to lower case to make the matching case-insensitive
        const normalizedStr = inputStr.toLowerCase();

        // Define a mapping of string representations to ConnectType values
        const stringToEnumMapping: { [key: string]: ConnectType } = {
            "percentage": ConnectType.Probability,
            "probability": ConnectType.Probability,
            "statecondition": ConnectType.StateCondition,
            "state_condition": ConnectType.StateCondition,
            "entitytemplate": ConnectType.EntityTemplate,
            "entity_template": ConnectType.EntityTemplate,
            // Legacy support
            "attributevalue": ConnectType.StateCondition
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