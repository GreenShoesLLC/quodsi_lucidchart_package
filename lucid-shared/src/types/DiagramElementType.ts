/**
 * Block vs line. The one declaration is @quodsi/shared's DiagramElementKind;
 * this is the name the extension and panel have always used for it. An alias
 * rather than a second enum: enums are nominal, so two enums with the same
 * values would not assign to each other.
 */
export { DiagramElementKind as DiagramElementType } from '@quodsi/shared';
