import { ParsedQs } from './interfaces/interface';

export interface CliConfig {
    token: string;
    output: string;
    queryString: ParsedQs;
}

function toBool(value: string | undefined): boolean {
    return value === 'true';
}

function toOptionalNumber(value: string | undefined): number | undefined {
    return value === undefined || value === '' ? undefined : Number(value);
}

export function parseConfig(env: Record<string, string | undefined>): CliConfig {
    const username = env.GH_USERNAME;
    const token = env.TOKEN;

    if (!username) throw new Error('GH_USERNAME environment variable is required');
    if (!token) throw new Error('TOKEN environment variable is required');

    return {
        token,
        output: env.OUTPUT || 'assets/activity-graph.svg',
        queryString: {
            username,
            theme: env.THEME || 'default',
            custom_title: env.CUSTOM_TITLE,
            hide_title: toBool(env.HIDE_TITLE),
            hide_border: toBool(env.HIDE_BORDER),
            bg_color: env.BG_COLOR,
            border_color: env.BORDER_COLOR,
            area_color: env.AREA_COLOR,
            color: env.TEXT_COLOR,
            line: env.LINE_COLOR,
            point: env.POINT_COLOR,
            title_color: env.TITLE_COLOR,
            area: toBool(env.AREA),
            radius: toOptionalNumber(env.RADIUS),
            height: toOptionalNumber(env.HEIGHT),
            days: env.DAYS,
            from: env.FROM,
            to: env.TO,
            grid: env.GRID,
        },
    };
}
