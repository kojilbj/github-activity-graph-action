import * as fs from 'fs';
import * as path from 'path';
import { Fetcher } from './fetcher';
import { Utilities } from './utils';
import { parseConfig } from './config';

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

    const outPath = path.resolve(process.cwd(), config.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, finalGraph.trim() + '\n');
    console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
