/**
 * Page conversion from the model panel's blank-slate card (spec 2026-09-15
 * section 1): the page's shape and line counts, and the result of a one-click
 * automatic conversion.
 */

/** Host -> panel reply to PAGE_COUNTS_REQUEST. */
export interface PageCountsData {
  pageId: string;
  shapeCount: number;
  lineCount: number;
}

/** Element counts of a conversion, in the shape of quodsi_studio's shared ConversionResult. */
export interface PageConversionCounts {
  activities: number;
  generators: number;
  resources: number;
  entities: number;
  connectors: number;
  skipped: number;
}

/** Host -> panel reply to AUTO_CONVERT_PAGE, sent with the request's envelope id. */
export type AutoConvertPageResultData =
  | { success: true; result: PageConversionCounts }
  | { success: false; error: string };
