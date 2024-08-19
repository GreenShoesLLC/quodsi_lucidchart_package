import { CustomBlockProxy } from "lucid-extension-sdk";
export declare class QuodsimBlock extends CustomBlockProxy {
    static library: string;
    static shape: string;
    getTextContent(): string;
    setTextContent(text: string): "" | undefined;
}
