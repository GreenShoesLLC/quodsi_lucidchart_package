import type { ConversionCounts } from '@quodsi/shared';

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

/** Element counts of a conversion -- @quodsi/shared's ConversionCounts (the
 *  same type as quodsi_studio's shared ConversionResult). */
export type PageConversionCounts = ConversionCounts;

/** Host -> panel reply to AUTO_CONVERT_PAGE, sent with the request's envelope id. */
export type AutoConvertPageResultData =
  | { success: true; result: PageConversionCounts }
  | { success: false; error: string };
