// The editor extension runs in Lucid's sandboxed VM (QuickJS), not a browser
// and not Node: setTimeout, setInterval, URLSearchParams and
// requestAnimationFrame do not exist there. Jest runs under Node, which has
// them all, so a unit test of the code itself can never catch a use. This scan
// can. Seen for real: URLSearchParams (2026-09-04) and setTimeout in
// ModelManager.validateModel (2026-10-21, broke the onboarding tour in Lucid).
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..', 'src');
const MISSING_IN_SANDBOX = /\b(setTimeout|setInterval|URLSearchParams|requestAnimationFrame)\s*\(/;

function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return sourceFiles(p);
        return /\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
    });
}

function withoutComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('extension code uses only what Lucid\'s sandbox provides', () => {
    it('never calls setTimeout, setInterval, URLSearchParams or requestAnimationFrame', () => {
        const offenders = sourceFiles(SRC).flatMap((file) =>
            withoutComments(fs.readFileSync(file, 'utf8'))
                .split('\n')
                .map((line, i) => ({ file: path.relative(SRC, file), line: i + 1, text: line.trim() }))
                .filter(({ text }) => MISSING_IN_SANDBOX.test(text)),
        );
        expect(offenders).toEqual([]);
    });
});
