import { renderLineChart } from './renderLineChart';
import { graphSvg } from './svgs';
import { Colors, ContributionDay } from './interfaces/interface';

export class Card {
    constructor(
        private readonly height: number,
        private readonly width: number,
        private readonly radius: number,
        private readonly colors: Colors,
        private readonly title = '',
        private readonly area = false,
        private readonly showGrid = true,
    ) {}

    async buildGraph(days: ContributionDay[]): Promise<string> {
        const line = renderLineChart(
            days.map((day) => ({ label: day.date, value: day.contributionCount })),
            {
                width: this.width,
                height: this.height,
                showArea: this.area,
                showGrid: this.showGrid,
            },
        );

        const args = {
            height: this.height,
            width: this.width,
            colors: this.colors,
            title: this.title,
            radius: this.radius,
            line,
        };

        return graphSvg(args);
    }
}
