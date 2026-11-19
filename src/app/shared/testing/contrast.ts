/** Converts any CSS colour the browser understands (hex, rgb(), oklch(), ...) to sRGB 0-255. */
function toRgb(cssColor: string): [number, number, number] {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = cssColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two CSS colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
    const [lighter, darker] = [relativeLuminance(toRgb(a)), relativeLuminance(toRgb(b))].sort(
        (x, y) => y - x
    );
    return (lighter + 0.05) / (darker + 0.05);
}
