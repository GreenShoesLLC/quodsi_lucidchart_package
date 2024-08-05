import { Viewport, ItemProxy } from 'lucid-extension-sdk';
import { LucidChartMessage } from './LucidChartMessage';

export class LucidChartUtils {
    public static readonly OBJECT_TYPE_KEY = 'q_objecttype';
    public static readonly DATA_KEY = 'q_data';

    /**
     * Gets the value of a specified shape data attribute from an item
     * @param item The ItemProxy to get the attribute from
     * @param attributeKey The key of the shape data attribute
     * @returns The value of the attribute, or undefined if not found or invalid
     */
    public static getShapeDataAttribute(item: ItemProxy, attributeKey: string): string | undefined {
        const attributeValue = item.shapeData.get(attributeKey);
        if (typeof attributeValue === 'string' || attributeValue === undefined) {
            console.log(`${attributeKey} value:`, attributeValue);
            return attributeValue;
        } else {
            console.error(`Invalid type for ${attributeKey}:`, typeof attributeValue);
            return undefined;
        }
    }

    /**
     * Gets the first selected item and its object type
     * @param client The LucidChart client object
     * @param firstSelectedItem Optional: A pre-selected item
     * @returns An object containing the first selected item and its object type
     */
    public static getFirstSelectedItemAndType(client: any, firstSelectedItem?: ItemProxy): {
        firstSelectedItem: ItemProxy | null,
        objectType: string | undefined
    } {
        let selectedItem = firstSelectedItem || null;

        if (!selectedItem) {
            const viewport = new Viewport(client);
            const selection = viewport.getSelectedItems();
            if (selection.length > 0) {
                selectedItem = selection[0];
            } else {
                console.error("No items selected");
                return { firstSelectedItem: null, objectType: undefined };
            }
        }

        const objectType = selectedItem
            ? LucidChartUtils.getShapeDataAttribute(selectedItem, LucidChartUtils.OBJECT_TYPE_KEY)
            : undefined;

        return { firstSelectedItem: selectedItem, objectType };
    }
    /**
     * Determines the q_objecttype value based on the number of selected items
     * @param items An array of ItemProxy objects
     * @returns The determined q_objecttype value
     */
    public static determineObjectTypeValue(items: ItemProxy[]): string {
        if (items.length === 0) {
            return 'nothing';
        } else if (items.length > 1) {
            return 'MoreThan1';
        } else {
            // There's exactly one item
            const singleItem = items[0];
            return LucidChartUtils.getShapeDataAttribute(singleItem, LucidChartUtils.OBJECT_TYPE_KEY) || 'undefined';
        }
    }

    // You can add more static methods here as needed
}