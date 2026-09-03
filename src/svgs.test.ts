import { describe, expect, it } from 'vitest';
import { escapeXml, graphSvg } from './svgs';
import { Colors } from './interfaces/interface';

describe('escapeXml', () => {
    it('escapes & first, then <, >, ", and \'', () => {
        expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        expect(escapeXml('<script>')).toBe('&lt;script&gt;');
        expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
        expect(escapeXml("it's")).toBe('it&apos;s');
    });

    it('does not double-escape an already-present entity-like ampersand', () => {
        // Escaping & first (before < and >) means an ampersand that happens to
        // precede "amp;" text is still escaped exactly once, not turned into
        // "&amp;amp;" by a later pass.
        expect(escapeXml('A & B < C')).toBe('A &amp; B &lt; C');
    });
});

describe('graphSvg', () => {
    const colors: Colors = {
        areaColor: '111111',
        bgColor: '222222',
        borderColor: '333333',
        color: '444444',
        titleColor: '555555',
        lineColor: '666666',
        pointColor: '777777',
    };

    it('escapes a title containing &, <, > so the output is well-formed XML', () => {
        const svg = graphSvg({
            height: 420,
            width: 1200,
            colors,
            title: `Bob & Alice's <Contributions> "2026"`,
            radius: 0,
            line: '<path d="M0 0" />',
        });

        expect(svg).toContain('Bob &amp; Alice&apos;s &lt;Contributions&gt; &quot;2026&quot;');
        // The raw, unescaped title must not appear in the output.
        expect(svg).not.toContain(`Bob & Alice's <Contributions> "2026"`);
    });
});
