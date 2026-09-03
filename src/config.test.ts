import { describe, expect, it } from 'vitest';
import { parseConfig } from './config';

describe('parseConfig', () => {
    it('throws when GH_USERNAME is missing', () => {
        expect(() => parseConfig({ TOKEN: 'abc' })).toThrow(/GH_USERNAME/);
    });

    it('throws when TOKEN is missing', () => {
        expect(() => parseConfig({ GH_USERNAME: 'kojilbj' })).toThrow(/TOKEN/);
    });

    it('applies defaults when only the required vars are set', () => {
        const config = parseConfig({ GH_USERNAME: 'kojilbj', TOKEN: 'abc' });

        expect(config.token).toBe('abc');
        expect(config.output).toBe('assets/activity-graph.svg');
        expect(config.queryString.username).toBe('kojilbj');
        expect(config.queryString.theme).toBe('default');
        expect(config.queryString.hide_title).toBe(false);
        expect(config.queryString.hide_border).toBe(false);
        expect(config.queryString.area).toBe(false);
    });

    it('maps every optional env var through to the query string', () => {
        const config = parseConfig({
            GH_USERNAME: 'kojilbj',
            TOKEN: 'abc',
            OUTPUT: 'graph.svg',
            THEME: 'github-dark-dimmed',
            CUSTOM_TITLE: "Koji's Graph",
            HIDE_TITLE: 'true',
            HIDE_BORDER: 'true',
            BG_COLOR: '000000',
            BORDER_COLOR: '111111',
            AREA_COLOR: '222222',
            TEXT_COLOR: '333333',
            LINE_COLOR: '444444',
            POINT_COLOR: '555555',
            TITLE_COLOR: '666666',
            AREA: 'true',
            GRID: 'false',
            RADIUS: '8',
            HEIGHT: '300',
            DAYS: '60',
            FROM: '2026-01-01',
            TO: '2026-02-01',
        });

        expect(config.output).toBe('graph.svg');
        expect(config.queryString).toMatchObject({
            username: 'kojilbj',
            theme: 'github-dark-dimmed',
            custom_title: "Koji's Graph",
            hide_title: true,
            hide_border: true,
            bg_color: '000000',
            border_color: '111111',
            area_color: '222222',
            color: '333333',
            line: '444444',
            point: '555555',
            title_color: '666666',
            area: true,
            grid: 'false',
            radius: 8,
            height: 300,
            days: '60',
            from: '2026-01-01',
            to: '2026-02-01',
        });
    });

    it('parses the exact default env action.yml sends when a consumer only sets username/token', () => {
        // This mirrors action.yml's `inputs` defaults verbatim (all optional
        // inputs are always sent as strings, never left undefined) — the
        // production shape this action actually runs under.
        const config = parseConfig({
            GH_USERNAME: 'kojilbj',
            TOKEN: 'abc',
            OUTPUT: 'assets/activity-graph.svg',
            THEME: 'default',
            CUSTOM_TITLE: '',
            HIDE_TITLE: 'false',
            HIDE_BORDER: 'false',
            BG_COLOR: '',
            BORDER_COLOR: '',
            AREA_COLOR: '',
            TEXT_COLOR: '',
            LINE_COLOR: '',
            POINT_COLOR: '',
            TITLE_COLOR: '',
            AREA: 'false',
            GRID: 'true',
            RADIUS: '0',
            HEIGHT: '420',
            DAYS: '31',
            FROM: '',
            TO: '',
        });

        expect(config.token).toBe('abc');
        expect(config.output).toBe('assets/activity-graph.svg');
        expect(config.queryString).toMatchObject({
            username: 'kojilbj',
            theme: 'default',
            custom_title: '',
            hide_title: false,
            hide_border: false,
            bg_color: '',
            border_color: '',
            area_color: '',
            color: '',
            line: '',
            point: '',
            title_color: '',
            area: false,
            grid: 'true',
            // action.yml sends RADIUS/HEIGHT as '0'/'420' (their real
            // defaults, not empty strings), so toOptionalNumber parses them
            // through as numbers here.
            radius: 0,
            height: 420,
            days: '31',
            from: '',
            to: '',
        });
    });
});
