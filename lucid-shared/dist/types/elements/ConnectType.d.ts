/**
 * Connect type enumeration for routing logic.
 *
 * Defines how entities are routed through connectors in the simulation.
 */
export declare enum ConnectType {
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
export declare class ConnectTypeUtils {
    static stringToConnectRule(inputStr: string): ConnectType;
}
//# sourceMappingURL=ConnectType.d.ts.map