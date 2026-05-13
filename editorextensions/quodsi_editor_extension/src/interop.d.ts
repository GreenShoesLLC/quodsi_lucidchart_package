/** @ignore */
declare namespace lucid {
    export function executeCommand(name: string, params: any): any;
    export function listen(msg: any): void;
    export function getPackageId(): string;
    export function getVersion(): string;
}

/**
 * Build-time constant injected by webpack's DefinePlugin from
 * `local-studio-url.txt` (gitignored). Empty string when the file is
 * absent — i.e., in CI / cloud bundles. See authHandler.ts for usage
 * and webpack.config.js for the inject logic.
 */
declare const __LOCAL_STUDIO_OVERRIDE__: string;

/** @ignore */
declare const console: Console;

// from lib.dom.d.ts
/** @ignore */
interface Console {
    assert(condition?: boolean, ...data: any[]): void;
    clear(): void;
    count(label?: string): void;
    countReset(label?: string): void;
    debug(...data: any[]): void;
    dir(item?: any, options?: any): void;
    dirxml(...data: any[]): void;
    error(...data: any[]): void;
    group(...data: any[]): void;
    groupCollapsed(...data: any[]): void;
    groupEnd(): void;
    info(...data: any[]): void;
    log(...data: any[]): void;
    table(tabularData?: any, properties?: string[]): void;
    time(label?: string): void;
    timeEnd(label?: string): void;
    timeLog(label?: string, ...data: any[]): void;
    timeStamp(label?: string): void;
    trace(...data: any[]): void;
    warn(...data: any[]): void;
}

declare class I18nSafeString {
    public value: string;
    constructor(str: string);
}

declare interface I18nFormattedNumberParams {
    useGrouping?: boolean;
    minimumIntegerDigits?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

declare class I18nFormattedNumber {}

declare interface I18nReplacement {
    [s: string]: number | string | I18nSafeString | I18nFormattedNumber;
}

declare namespace i18n {
    function setData(data: {[key: string]: string}, language: string): void;
    function get(key: string, replacements?: I18nReplacement, wrappers?: string[], gender?: string): string;
    function getLanguage(): string;
    function getInLocale(locale: string, key: string, replacements?: I18nReplacement, wrappers?: string[]): string;
    function formatNumber(value: number, params: I18nFormattedNumberParams): I18nFormattedNumber;
}
