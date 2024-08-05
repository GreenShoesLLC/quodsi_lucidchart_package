import { ItemProxy } from 'lucid-extension-sdk';
export declare class LucidChartUtils {
    static readonly OBJECT_TYPE_KEY = "q_objecttype";
    static readonly DATA_KEY = "q_data";
    /**
     * Gets the value of a specified shape data attribute from an item
     * @param item The ItemProxy to get the attribute from
     * @param attributeKey The key of the shape data attribute
     * @returns The value of the attribute, or undefined if not found or invalid
     */
    static getShapeDataAttribute(item: ItemProxy, attributeKey: string): string | undefined;
    /**
     * Gets the first selected item and its object type
     * @param client The LucidChart client object
     * @param firstSelectedItem Optional: A pre-selected item
     * @returns An object containing the first selected item and its object type
     */
    static getFirstSelectedItemAndType(client: any, firstSelectedItem?: ItemProxy): {
        firstSelectedItem: ItemProxy | null;
        objectType: string | undefined;
    };
    /**
     * Determines the q_objecttype value based on the number of selected items
     * @param items An array of ItemProxy objects
     * @returns The determined q_objecttype value
     */
    static determineObjectTypeValue(items: ItemProxy[]): string;
}
