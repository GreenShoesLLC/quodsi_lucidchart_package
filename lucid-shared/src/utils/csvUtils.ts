// src/utils/csvUtils.ts
export async function parseCsvBlob(blob: Blob): Promise<string[][]> {
    const text = await blob.text();
    const rows = text.split('\n').map(row => row.split(','));
    return rows;
}

export function calculateTableDimensions(data: string[][]): { width: number; height: number } {
    const padding = 20;
    const cellWidth = 120;
    const cellHeight = 30;

    const cols = data[0]?.length || 0;
    const rows = data.length;

    return {
        width: (cols * cellWidth) + (padding * 2),
        height: (rows * cellHeight) + (padding * 2)
    };
}