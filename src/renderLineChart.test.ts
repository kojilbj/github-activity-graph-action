import { describe, expect, it } from 'vitest';
import { computeCurveSegments, computeYAxisTicks, renderLineChart } from './renderLineChart';

describe('computeYAxisTicks', () => {
    it('rounds up to a nice step covering the max value', () => {
        expect(computeYAxisTicks(75)).toEqual([0, 20, 40, 60, 80]);
    });

    it('never returns a fractional step for small max values', () => {
        const ticks = computeYAxisTicks(3);
        expect(ticks.every((tick) => Number.isInteger(tick))).toBe(true);
        expect(Math.max(...ticks)).toBeGreaterThanOrEqual(3);
    });

    it('handles an all-zero data set without dividing by zero', () => {
        expect(computeYAxisTicks(0)).toEqual([0, 1, 2, 3, 4]);
    });
});

describe('computeCurveSegments', () => {
    it('keeps the tangent flat at a local peak, so the curve vertex lines up with the data point', () => {
        // value goes up then down: the middle point is a local peak
        const coords = [
            { x: 0, y: 10 },
            { x: 10, y: 0 },
            { x: 20, y: 10 },
        ];
        const segments = computeCurveSegments(coords);

        // control point arriving at the peak (end of segment 0) is level with the peak
        expect(segments[0].cp2.y).toBeCloseTo(coords[1].y);
        // control point leaving the peak (start of segment 1) is level with the peak
        expect(segments[1].cp1.y).toBeCloseTo(coords[1].y);
    });

    it('keeps the tangent flat at a local valley too', () => {
        const coords = [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 20, y: 0 },
        ];
        const segments = computeCurveSegments(coords);

        expect(segments[0].cp2.y).toBeCloseTo(coords[1].y);
        expect(segments[1].cp1.y).toBeCloseTo(coords[1].y);
    });

    it('still curves smoothly (non-flat tangent) through a monotonic run', () => {
        const coords = [
            { x: 0, y: 20 },
            { x: 10, y: 10 },
            { x: 20, y: 0 },
        ];
        const segments = computeCurveSegments(coords);

        expect(segments[0].cp2.y).not.toBeCloseTo(coords[1].y);
        expect(segments[1].cp1.y).not.toBeCloseTo(coords[1].y);
    });
});

describe('renderLineChart', () => {
    const points = [
        { label: '1', value: 0 },
        { label: '2', value: 10 },
        { label: '3', value: 5 },
    ];

    it('draws one point marker per data point', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: true });
        const pointCount = (svg.match(/class="ct-point"/g) ?? []).length;
        expect(pointCount).toBe(points.length);
    });

    it('connects points with a smooth curve through every data point', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: true });
        const dMatch = svg.match(/<path d="([^"]+)" class="ct-line"/);
        expect(dMatch).not.toBeNull();
        const d = dMatch![1];
        expect(d.startsWith('M')).toBe(true);
        expect((d.match(/C/g) ?? []).length).toBe(points.length - 1);
        expect(d).not.toContain('L'); // fully smooth, no straight segments
    });

    it('curves the area fill outline too, not just the line', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: true, showGrid: true });
        const dMatch = svg.match(/<path d="([^"]+)" class="ct-area"/);
        expect(dMatch).not.toBeNull();
        expect(dMatch![1]).toContain('C');
    });

    it('includes each label in the rendered output', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: true });
        for (const point of points) {
            expect(svg).toContain(`>${point.label}</text>`);
        }
    });

    it('omits the area fill when showArea is false', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: true });
        expect(svg).not.toContain('ct-area');
    });

    it('includes an area fill when showArea is true', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: true, showGrid: true });
        expect(svg).toContain('class="ct-area"');
    });

    it('omits grid lines when showGrid is false', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: false });
        expect(svg).not.toContain('ct-grid');
    });

    it('includes grid lines when showGrid is true', () => {
        const svg = renderLineChart(points, { width: 1200, height: 420, showArea: false, showGrid: true });
        expect(svg).toContain('ct-grid');
    });
});
