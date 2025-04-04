import { PageProxy } from 'lucid-extension-sdk';
import { ConversionResult, QuodsiLogger } from '@quodsi/shared';
import { ModelDataSource } from '../../data_sources/model/ModelDataSource';
export declare class PageSchemaConversionService extends QuodsiLogger {
    private modelDataSource;
    protected readonly LOG_PREFIX = "[PageSchemaConversionService]";
    constructor(modelDataSource: ModelDataSource);
    private analyzePage;
    canConvertPage(page: PageProxy): boolean;
    convertPage(page: PageProxy, documentId: string): Promise<ConversionResult>;
    private updateBlockAnalysis;
    private determineElementTypes;
    private getBlockName;
}
//# sourceMappingURL=PageSchemaConversionService.d.ts.map