import * as fs from 'fs';
import * as path from 'path';
import { Fetcher } from './fetcher';
import { Utilities } from './utils';
import { parseConfig } from './config';

// Lightweight structural sanity check for the generated SVG. This is defense
// in depth against unescaped user input (e.g. an `&`, `<`, or `>` in a title)
// slipping through and producing malformed XML that GitHub's README renderer
// would refuse to display. It is not a full XML parser — just a check for
// the failure mode that actually matters here.
function assertWellFormedXml(svg: string): void {
    const trimmed = svg.trim();
    if (!trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>')) {
        throw new Error('Generated SVG is not well-formed: missing <svg>...</svg> wrapper');
    }

    const bareAmpersand = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.exec(trimmed);
    if (bareAmpersand) {
        const start = Math.max(0, bareAmpersand.index - 20);
        const snippet = trimmed.slice(start, bareAmpersand.index + 20);
        throw new Error(`Generated SVG contains an unescaped "&": ...${snippet}...`);
    }
}

async function main() {
    const config = parseConfig(process.env);

    const utils = new Utilities(config.queryString);
    const queryOptions = utils.queryOptions();
    const fetcher = new Fetcher(utils.username);
    const calendarData = await fetcher.fetchContributions(
        queryOptions.days,
        queryOptions.from,
        queryOptions.to,
    );

    if (typeof calendarData === 'string') {
        throw new Error(`Failed to fetch contributions: ${calendarData}`);
    }

    const { finalGraph } = await utils.buildGraph(calendarData);

    assertWellFormedXml(finalGraph);

    const outPath = path.resolve(process.cwd(), config.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, finalGraph.trim() + '\n');
    console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
