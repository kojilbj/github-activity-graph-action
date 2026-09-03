# github-activity-graph-action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `kojilbj/github-activity-graph-action` — a reusable composite GitHub Action that renders a GitHub user's contribution activity as a static SVG and optionally commits it, so other repos can adopt the same approach `kojilbj/kojilbj` already uses without copying source files by hand.

**Architecture:** Move the existing rendering library (`fetcher.ts`, `utils.ts`, `GraphCards.ts`, `svgs.ts`, `renderLineChart.ts`, `interfaces/`, `styles/`) from `kojilbj/kojilbj`'s `scripts/activity-graph/` into this repo's `src/` unchanged. Add a new `src/config.ts` (env vars → typed config, TDD'd) and `src/cli.ts` (orchestration entrypoint) to generalize what `kojilbj/kojilbj`'s `generate.ts` hardcoded. Wrap it all in a composite `action.yml` (no bundler) that installs its own dependencies, runs the CLI with inputs mapped to env vars, and optionally commits/pushes the result. Finish by pointing `kojilbj/kojilbj`'s own workflow at this action (dogfooding) and deleting the now-duplicated code there.

**Tech Stack:** TypeScript, ts-node, vitest, axios, moment, dotenv, GitHub Actions (composite action).

**Spec:** `docs/superpowers/specs/2026-09-03-github-activity-graph-action-design.md`

## Global Constraints

- No hosted API, no npm publish — this ships only as a `uses: kojilbj/github-activity-graph-action@ref` GitHub Action (spec: Non-goals).
- Composite action, not a JavaScript action — no `@vercel/ncc` bundling step to maintain (spec: Architecture).
- Card width stays fixed at `1200`, not exposed as an input (spec: inputs table note).
- `cli.ts` throws and exits non-zero on a contributions-fetch error instead of emitting an "invalid user" placeholder SVG (spec: Error handling).
- Push authentication reuses the consumer's own `actions/checkout` credentials; this action never accepts a separate push token (spec: Data flow, step d).
- Git identity for the generated commit defaults to `github-actions[bot]` / `github-actions[bot]@users.noreply.github.com`, both overridable (spec: inputs table).
- Do not add `Co-Authored-By: Claude ...` or `🤖 Generated with Claude Code` to any commit message or PR description in this repo (explicit user instruction, this session).

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: an npm project where `npm install`, `npx tsc --noEmit`, and `npm test` (vitest, zero tests yet) all run cleanly. Later tasks depend on this working.

- [ ] **Step 1: Write `package.json`**

```json
{
    "name": "github-activity-graph-action",
    "private": true,
    "scripts": {
        "test": "vitest run"
    },
    "dependencies": {
        "axios": "^1.11.0",
        "dotenv": "^17.2.1",
        "moment": "^2.30.1"
    },
    "devDependencies": {
        "@types/node": "^24.3.0",
        "ts-node": "^10.9.2",
        "typescript": "^5.9.2",
        "vitest": "^5.0.0"
    }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
    "compilerOptions": {
        "target": "es2017",
        "module": "commonjs",
        "lib": ["dom", "es2017"],
        "moduleResolution": "node",
        "esModuleInterop": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "strict": false,
        "outDir": "./dist"
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 4: Install and verify**

Run: `npm install`
Expected: installs with 0 vulnerabilities (only axios/dotenv/moment/typescript/ts-node/vitest and their transitive deps — none of the old `node-chartist`/`jsdom` chain).

Run: `npx tsc --noEmit`
Expected: passes (no `src/` files yet, nothing to check, exit 0).

Run: `npm test`
Expected: vitest reports "No test files found" and exits non-zero (there are no test files yet — this is expected at this point; it becomes green once Task 2 adds `renderLineChart.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json .gitignore
git commit -m "chore: scaffold npm project"
git push
```

---

## Task 2: Move the rendering library

**Files:**
- Create: `src/interfaces/interface.ts`
- Create: `src/styles/themes.ts`
- Create: `src/styles/graphStyle.ts`
- Create: `src/styles/graphAnimation.ts`
- Create: `src/svgs.ts`
- Create: `src/fetcher.ts`
- Create: `src/GraphCards.ts`
- Create: `src/utils.ts`
- Create: `src/renderLineChart.ts`
- Create: `src/renderLineChart.test.ts`

**Interfaces:**
- Consumes: nothing new — these files' internal imports (`./interfaces/interface`, `./styles/themes`, `./svgs`, `./renderLineChart`, `./GraphCards`) are unchanged from `kojilbj/kojilbj`, so the directory layout must match exactly (`src/interfaces/`, `src/styles/`, everything else flat under `src/`).
- Produces: `Fetcher` (from `fetcher.ts`), `Utilities` (from `utils.ts`), `renderLineChart`/`computeYAxisTicks`/`computeCurveSegments` (from `renderLineChart.ts`) — Task 4's `cli.ts` imports `Fetcher` and `Utilities` directly.

This is a verbatim move from the already-shipped, already-tested code in `kojilbj/kojilbj`. Copy file contents unchanged — do not paraphrase or "improve" anything here, that's out of scope for this task.

- [ ] **Step 1: Copy the files**

Run (adjust the source path if `kojilbj/kojilbj` is checked out somewhere other than `~/Desktop/kojilbj` — it's a sibling of wherever this repo's `src/` lives):

```bash
SRC=~/Desktop/kojilbj/scripts/activity-graph
mkdir -p src/interfaces src/styles
cp "$SRC/interfaces/interface.ts" src/interfaces/interface.ts
cp "$SRC/styles/themes.ts" src/styles/themes.ts
cp "$SRC/styles/graphStyle.ts" src/styles/graphStyle.ts
cp "$SRC/styles/graphAnimation.ts" src/styles/graphAnimation.ts
cp "$SRC/svgs.ts" src/svgs.ts
cp "$SRC/fetcher.ts" src/fetcher.ts
cp "$SRC/GraphCards.ts" src/GraphCards.ts
cp "$SRC/utils.ts" src/utils.ts
cp "$SRC/renderLineChart.ts" src/renderLineChart.ts
cp "$SRC/renderLineChart.test.ts" src/renderLineChart.test.ts
```

- [ ] **Step 2: Verify the move didn't break anything**

Run: `npx tsc --noEmit`
Expected: exits 0, no type errors.

Run: `npm test`
Expected: 14 tests pass (`computeYAxisTicks`: 3, `computeCurveSegments`: 3, `renderLineChart`: 8) — the exact same suite that already passes in `kojilbj/kojilbj`.

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: move rendering library from kojilbj/kojilbj"
git push
```

---

## Task 3: `src/config.ts` — env vars to typed config

**Files:**
- Create: `src/config.ts`
- Test: `src/config.test.ts`

**Interfaces:**
- Consumes: `ParsedQs` from `src/interfaces/interface.ts` (Task 2).
- Produces: `CliConfig` interface and `parseConfig(env: NodeJS.ProcessEnv): CliConfig`. Task 4's `cli.ts` calls `parseConfig(process.env)` and uses `.token` (not otherwise consumed — `Fetcher` reads `process.env.TOKEN` directly, unchanged from `kojilbj/kojilbj`) and `.output` and `.queryString` (passed straight into `new Utilities(config.queryString)`).

- [ ] **Step 1: Write the failing tests**

Create `src/config.test.ts`:

```typescript
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
            COLOR: '333333',
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/config.test.ts`
Expected: FAIL — `Cannot find module './config'` (the module doesn't exist yet).

- [ ] **Step 3: Write `src/config.ts`**

```typescript
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
            color: env.COLOR,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/config.test.ts`
Expected: PASS, 4 tests.

Run: `npm test`
Expected: all 18 tests pass (14 from Task 2 + 4 new).

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat: add env-var config parsing"
git push
```

---

## Task 4: `src/cli.ts` — orchestration entrypoint

**Files:**
- Create: `src/cli.ts`

**Interfaces:**
- Consumes: `parseConfig` (Task 3), `Fetcher` and `Utilities` (Task 2).
- Produces: a script runnable as `ts-node src/cli.ts` that reads `process.env`, writes the rendered SVG to the configured `output` path (resolved against `process.cwd()`), and exits non-zero with an error message on failure. `action.yml` (Task 5) invokes this directly.

This orchestrates a real network call (GitHub's GraphQL API), so it is not unit-tested — `config.ts` and the rendering library underneath it already carry the unit test coverage. Verification here is a real, manual end-to-end run, same as how `kojilbj/kojilbj`'s `generate.ts` was validated throughout its own development.

- [ ] **Step 1: Write `src/cli.ts`**

```typescript
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
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Manual end-to-end run**

Run (uses a real GitHub token — `gh auth token` reuses your existing `gh` CLI login if you have one):

```bash
GH_USERNAME=kojilbj TOKEN=$(gh auth token) npx ts-node src/cli.ts
```

Expected: prints `Wrote <absolute path>/assets/activity-graph.svg`, and the file exists.

Verify the output is well-formed:

```bash
python3 -c "import xml.etree.ElementTree as ET; ET.parse('assets/activity-graph.svg'); print('OK: well-formed XML')"
```

Expected: `OK: well-formed XML`.

- [ ] **Step 4: Verify the failure path**

Run:

```bash
GH_USERNAME=this-username-should-not-exist-anywhere-xyz TOKEN=$(gh auth token) npx ts-node src/cli.ts; echo "exit code: $?"
```

Expected: prints an `Error: Failed to fetch contributions: ...` to stderr, and `exit code: 1` (non-zero — confirms the "fail loudly" error-handling behavior from the spec, rather than silently writing an "invalid user" placeholder SVG).

- [ ] **Step 5: Clean up the local test output and commit**

```bash
rm -rf assets
git add src/cli.ts
git commit -m "feat: add cli entrypoint"
git push
```

---

## Task 5: `action.yml` — the composite action

**Files:**
- Create: `action.yml`

**Interfaces:**
- Consumes: `src/cli.ts` (Task 4) via its env-var contract (`GH_USERNAME`, `TOKEN`, `OUTPUT`, `THEME`, `CUSTOM_TITLE`, `HIDE_TITLE`, `HIDE_BORDER`, `BG_COLOR`, `BORDER_COLOR`, `AREA_COLOR`, `COLOR`, `LINE_COLOR`, `POINT_COLOR`, `TITLE_COLOR`, `AREA`, `GRID`, `RADIUS`, `HEIGHT`, `DAYS`, `FROM`, `TO`).
- Produces: the `kojilbj/github-activity-graph-action` public contract — the `with:` inputs and `outputs` a consuming workflow uses. This is what Task 7 (dogfooding) and any future external consumer depends on; do not rename an input after this point without treating it as a breaking change.

- [ ] **Step 1: Write `action.yml`**

```yaml
name: 'GitHub Activity Graph'
description: 'Renders a GitHub contributions activity graph as a static SVG and optionally commits it.'
author: 'kojilbj'

inputs:
  username:
    description: 'GitHub username to render the graph for'
    required: true
  token:
    description: 'GitHub personal access token (repo scope) used for the GraphQL contributions query'
    required: true
  output:
    description: 'Path (relative to the checked-out repo) to write the SVG to'
    required: false
    default: 'assets/activity-graph.svg'
  theme:
    description: 'Theme name (see src/styles/themes.ts for the full list)'
    required: false
    default: 'default'
  custom_title:
    description: 'Overrides the auto-generated "{name}''s Contribution Graph" title'
    required: false
    default: ''
  hide_title:
    description: 'Hide the title entirely ("true"/"false")'
    required: false
    default: 'false'
  hide_border:
    description: 'Hide the card border ("true"/"false")'
    required: false
    default: 'false'
  bg_color:
    description: 'Overrides the theme background color (hex, no #)'
    required: false
    default: ''
  border_color:
    description: 'Overrides the theme border color (hex, no #)'
    required: false
    default: ''
  area_color:
    description: 'Overrides the theme area-fill color (hex, no #)'
    required: false
    default: ''
  color:
    description: 'Overrides the theme primary text/line color (hex, no #)'
    required: false
    default: ''
  line:
    description: 'Overrides the theme line color (hex, no #)'
    required: false
    default: ''
  point:
    description: 'Overrides the theme point-marker color (hex, no #)'
    required: false
    default: ''
  title_color:
    description: 'Overrides the theme title color (hex, no #)'
    required: false
    default: ''
  area:
    description: 'Show the area fill under the line ("true"/"false")'
    required: false
    default: 'false'
  grid:
    description: 'Show grid lines ("true"/"false")'
    required: false
    default: 'true'
  radius:
    description: 'Card corner radius, clamped to [0, 16]'
    required: false
    default: '0'
  height:
    description: 'Card height, clamped to [200, 600]'
    required: false
    default: '420'
  days:
    description: 'Number of trailing days to plot (ignored if from/to are set)'
    required: false
    default: '31'
  from:
    description: 'Custom range start (YYYY-MM-DD); requires "to"'
    required: false
    default: ''
  to:
    description: 'Custom range end (YYYY-MM-DD); requires "from"'
    required: false
    default: ''
  commit:
    description: 'Whether to commit and push the generated SVG ("true"/"false")'
    required: false
    default: 'true'
  commit_message:
    description: 'Commit message used when commit is true'
    required: false
    default: 'chore: update activity graph'
  git_user_name:
    description: 'Commit author name'
    required: false
    default: 'github-actions[bot]'
  git_user_email:
    description: 'Commit author email'
    required: false
    default: 'github-actions[bot]@users.noreply.github.com'

outputs:
  svg_path:
    description: 'The path the SVG was written to'
    value: ${{ steps.generate.outputs.svg_path }}
  changed:
    description: 'Whether a new commit was made ("true"/"false")'
    value: ${{ steps.commit.outputs.changed }}

runs:
  using: 'composite'
  steps:
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install action dependencies
      shell: bash
      working-directory: ${{ github.action_path }}
      run: npm ci

    - name: Generate graph
      id: generate
      shell: bash
      env:
        GH_USERNAME: ${{ inputs.username }}
        TOKEN: ${{ inputs.token }}
        OUTPUT: ${{ inputs.output }}
        THEME: ${{ inputs.theme }}
        CUSTOM_TITLE: ${{ inputs.custom_title }}
        HIDE_TITLE: ${{ inputs.hide_title }}
        HIDE_BORDER: ${{ inputs.hide_border }}
        BG_COLOR: ${{ inputs.bg_color }}
        BORDER_COLOR: ${{ inputs.border_color }}
        AREA_COLOR: ${{ inputs.area_color }}
        COLOR: ${{ inputs.color }}
        LINE_COLOR: ${{ inputs.line }}
        POINT_COLOR: ${{ inputs.point }}
        TITLE_COLOR: ${{ inputs.title_color }}
        AREA: ${{ inputs.area }}
        GRID: ${{ inputs.grid }}
        RADIUS: ${{ inputs.radius }}
        HEIGHT: ${{ inputs.height }}
        DAYS: ${{ inputs.days }}
        FROM: ${{ inputs.from }}
        TO: ${{ inputs.to }}
      run: |
        "${{ github.action_path }}/node_modules/.bin/ts-node" "${{ github.action_path }}/src/cli.ts"
        echo "svg_path=${OUTPUT}" >> "$GITHUB_OUTPUT"

    - name: Commit and push
      id: commit
      shell: bash
      env:
        COMMIT: ${{ inputs.commit }}
        OUTPUT: ${{ inputs.output }}
        GIT_USER_NAME: ${{ inputs.git_user_name }}
        GIT_USER_EMAIL: ${{ inputs.git_user_email }}
        COMMIT_MESSAGE: ${{ inputs.commit_message }}
      run: |
        if [ "$COMMIT" != "true" ]; then
          echo "changed=false" >> "$GITHUB_OUTPUT"
          exit 0
        fi
        git config user.name "$GIT_USER_NAME"
        git config user.email "$GIT_USER_EMAIL"
        git add "$OUTPUT"
        if git diff --cached --quiet -- "$OUTPUT"; then
          git reset -- "$OUTPUT"
          echo "changed=false" >> "$GITHUB_OUTPUT"
        else
          git commit -m "$COMMIT_MESSAGE"
          git push
          echo "changed=true" >> "$GITHUB_OUTPUT"
        fi
```

Note on Step "Generate graph": `${{ github.action_path }}/node_modules/.bin/ts-node` is invoked by its explicit installed path rather than via `npx ts-node` — `npx` resolves against the current working directory (the *consumer's* checked-out repo, which has no `ts-node` installed), not against `github.action_path`, so a bare `npx ts-node` would fail or try to download an unrelated copy. The explicit path avoids that ambiguity. This step intentionally has no `working-directory` override, so it runs with `process.cwd()` equal to the consumer's checked-out repo (`GITHUB_WORKSPACE`) — required for `cli.ts`'s `path.resolve(process.cwd(), config.output)` to resolve `output` against the consumer's repo, not the action's own directory.

- [ ] **Step 2: Validate the YAML**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('action.yml')); print('OK: valid YAML')"
```

Expected: `OK: valid YAML`. (If `pyyaml` isn't installed, run `pip3 install --user pyyaml` first, or validate with `npx js-yaml action.yml >/dev/null && echo OK` instead.)

- [ ] **Step 3: Commit**

```bash
git add action.yml
git commit -m "feat: add composite action definition"
git push
```

(Real end-to-end verification of this file happens in Task 7, where a live workflow actually invokes it — a composite action's `runs:` steps can't be meaningfully exercised outside of an actual Actions run.)

---

## Task 6: `README.md` and `LICENSE`

**Files:**
- Create: `README.md`
- Create: `LICENSE`

**Interfaces:**
- Consumes: the finalized inputs/outputs table from Task 5's `action.yml` (must match exactly — copy-paste the table, don't retype it from memory).
- Produces: nothing other tasks depend on; this is the last piece before Task 7's dogfooding.

- [ ] **Step 1: Write `LICENSE`**

```
MIT License

Copyright (c) 2026 kojilbj

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Write `README.md`**

```markdown
# github-activity-graph-action

Renders a GitHub user's contribution activity as a static SVG and (optionally)
commits it straight into your repo — no hosted API to depend on, no server to
keep alive.

This exists because the popular hosted `github-readme-activity-graph` API
started returning `402 DEPLOYMENT_DISABLED`, breaking badges across a lot of
READMEs at once. Running this yourself via GitHub Actions means the graph
keeps working even if this action's own defaults ever change — worst case,
your README keeps showing the last successfully generated image instead of a
broken one.

## Usage

```yaml
name: Update activity graph
on:
  schedule:
    - cron: '0 18 * * *' # daily
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kojilbj/github-activity-graph-action@main
        with:
          username: your-github-username
          token: ${{ secrets.GRAPH_PAT }}
          theme: github-dark-dimmed
          custom_title: "Your Activity Graph"
          hide_border: true
```

Then embed the committed file in your README:

```markdown
![activity graph](./assets/activity-graph.svg)
```

`token` needs a GitHub Personal Access Token with `repo` scope (classic
token), stored as a repo secret — the built-in `secrets.GITHUB_TOKEN` doesn't
have permission to query another user's contribution data via GraphQL. Create
one at `https://github.com/settings/tokens/new`, then add it under
**Settings → Secrets and variables → Actions** in your repo.

## Inputs

| name | required | default | description |
|---|---|---|---|
| `username` | yes | — | GitHub username to render |
| `token` | yes | — | GitHub PAT (`repo` scope) for the GraphQL contributions query |
| `output` | no | `assets/activity-graph.svg` | Path (relative to your repo) to write the SVG |
| `theme` | no | `default` | Theme name — see `src/styles/themes.ts` for the full list |
| `custom_title` | no | — | Overrides the auto-generated title |
| `hide_title` | no | `false` | Hide the title entirely |
| `hide_border` | no | `false` | Hide the card border |
| `bg_color` | no | — | Overrides the theme background color (hex, no `#`) |
| `border_color` | no | — | Overrides the theme border color |
| `area_color` | no | — | Overrides the theme area-fill color |
| `color` | no | — | Overrides the theme primary color |
| `line` | no | — | Overrides the theme line color |
| `point` | no | — | Overrides the theme point-marker color |
| `title_color` | no | — | Overrides the theme title color |
| `area` | no | `false` | Show the area fill under the line |
| `grid` | no | `true` | Show grid lines |
| `radius` | no | `0` | Card corner radius, clamped to `[0, 16]` |
| `height` | no | `420` | Card height, clamped to `[200, 600]` |
| `days` | no | `31` | Number of trailing days to plot |
| `from` | no | — | Custom range start (`YYYY-MM-DD`); requires `to` |
| `to` | no | — | Custom range end (`YYYY-MM-DD`); requires `from` |
| `commit` | no | `true` | Whether to commit & push the generated SVG |
| `commit_message` | no | `chore: update activity graph` | Commit message |
| `git_user_name` | no | `github-actions[bot]` | Commit author name |
| `git_user_email` | no | `github-actions[bot]@users.noreply.github.com` | Commit author email |

## Outputs

| name | description |
|---|---|
| `svg_path` | The path the SVG was written to |
| `changed` | `"true"`/`"false"` — whether a new commit was made |

## Trying it out before committing to real use

**Dry run inside GitHub Actions** — no git side effects on your repo:

```yaml
name: Try activity graph
on: workflow_dispatch

jobs:
  try-it:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kojilbj/github-activity-graph-action@main
        with:
          username: your-github-username
          token: ${{ secrets.GRAPH_PAT }}
          commit: false
      - uses: actions/upload-artifact@v4
        with:
          name: activity-graph-preview
          path: assets/activity-graph.svg
```

Trigger it from the **Actions** tab, then download the artifact from the run
to see the result.

**Local CLI** — instant check from your terminal, no Actions run needed:

```bash
git clone https://github.com/kojilbj/github-activity-graph-action.git
cd github-activity-graph-action
npm install
GH_USERNAME=your-github-username TOKEN=your_pat npx ts-node src/cli.ts
```

This writes `assets/activity-graph.svg` in the cloned directory — open it in
a browser to check it.

## Development

```bash
npm install
npm test            # vitest — renderLineChart + config unit tests
npx tsc --noEmit     # typecheck
```

## Credit

The rendering approach and theme palette in `src/styles/themes.ts` were
originally adapted from
[Ashutosh00710/github-readme-activity-graph](https://github.com/Ashutosh00710/github-readme-activity-graph)
(MIT licensed).

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add README and LICENSE"
git push
```

---

## Task 7: Dogfood — switch `kojilbj/kojilbj` over

**Files (in the `kojilbj/kojilbj` repo, not this one):**
- Modify: `.github/workflows/activity-graph.yml`
- Delete: `scripts/activity-graph/` (entire directory)
- Modify: `package.json` (remove now-unused `axios`/`dotenv`/`moment`/`ts-node`/`typescript`/`vitest` deps and the `generate:activity-graph`/`test` scripts — unless still needed for something else in that repo; check before deleting)
- Delete: `tsconfig.json` (only if nothing else in `kojilbj/kojilbj` needs it — check first)

**Interfaces:**
- Consumes: `kojilbj/github-activity-graph-action@main`'s public `with:` contract from Task 5.

This is the real integration test for the whole plan: the action has to actually work when invoked from a separate repo's real workflow, producing a working badge on an actual GitHub profile README.

- [ ] **Step 1: Rewrite the workflow**

In the `kojilbj/kojilbj` repo, replace the contents of `.github/workflows/activity-graph.yml` with:

```yaml
name: Generate Activity Graph

on:
  schedule:
    - cron: "0 18 * * *" # daily at 03:00 JST
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate and commit activity graph
        uses: kojilbj/github-activity-graph-action@main
        with:
          username: kojilbj
          token: ${{ secrets.GRAPH_PAT }}
          theme: github-dark-dimmed
          custom_title: "Koji's Activity Graph"
          hide_border: true
```

- [ ] **Step 2: Remove the now-duplicated code**

In the `kojilbj/kojilbj` repo:

```bash
rm -rf scripts/activity-graph
```

Then check `package.json` and `tsconfig.json` for anything still needed elsewhere in that repo before removing them or their now-unused entries — if the profile repo has no other TypeScript/Node tooling, delete both files entirely along with the `generate:activity-graph` npm script; if something else still needs `npm test` or the TypeScript toolchain, only remove the `axios`/`dotenv`/`moment` runtime deps and the `scripts/activity-graph`-specific `test`/`generate:activity-graph` script entries.

- [ ] **Step 3: Commit the removal in `kojilbj/kojilbj`**

```bash
cd ~/Desktop/kojilbj
git checkout -b use-activity-graph-action
git add -A
git commit -m "refactor: use kojilbj/github-activity-graph-action instead of inline scripts"
git push -u origin use-activity-graph-action
```

- [ ] **Step 4: Trigger a real run and verify**

```bash
gh workflow run activity-graph.yml --ref use-activity-graph-action -R kojilbj/kojilbj
```

Wait for it to complete, then check:

```bash
gh run list --workflow=activity-graph.yml -R kojilbj/kojilbj --branch use-activity-graph-action --limit 1
```

Expected: `completed success`. If it fails, check the run's logs (`gh run view --log -R kojilbj/kojilbj <run-id>`) — likely causes are a missing `GRAPH_PAT` secret in `kojilbj/kojilbj`, or an `action.yml` step error from Task 5.

Then confirm the committed SVG is well-formed:

```bash
git pull
python3 -c "import xml.etree.ElementTree as ET; ET.parse('assets/activity-graph.svg'); print('OK: well-formed XML')"
```

- [ ] **Step 5: Open a PR in `kojilbj/kojilbj`**

```bash
gh pr create -R kojilbj/kojilbj --title "Use kojilbj/github-activity-graph-action instead of inline scripts" --body "$(cat <<'EOF'
## Summary
- Replaces the inline activity-graph implementation with the new, reusable kojilbj/github-activity-graph-action.
- Verified via a real workflow_dispatch run on this branch (see Actions tab).

## Test plan
- [x] Triggered the workflow on this branch and confirmed it completed successfully
- [x] Confirmed the committed SVG is well-formed XML
EOF
)"
```

Do not add a Claude attribution line to this PR body (Global Constraints).

---

## Self-Review Notes

- **Spec coverage:** Motivation/Non-goals → addressed by Architecture (Task 1-2) and Global Constraints. Architecture/file layout → Tasks 1-5 match the spec's tree exactly. Inputs/outputs table → Task 5's `action.yml` and Task 6's README table are copy-identical to the spec. Data flow → Task 5, including the `git add` + `git diff --cached` fix already folded in from the spec's own self-review. Error handling → Task 4 Step 4 explicitly tests the non-zero-exit path. Testing plan → Task 2 (moved tests), Task 3 (new config tests), Task 4 (manual cli.ts verification), Task 7 (dogfooding as the real integration test). Trying it out → Task 6 README. Versioning → intentionally deferred past this plan (tag `v1` once `kojilbj/kojilbj` has run on `@main` successfully for a while; not a task here since it has no code changes to verify). Attribution → Task 6 LICENSE + README credit section.
- **Placeholder scan:** No TBD/TODO; every code block is complete, runnable content, not a description of what to write.
- **Type consistency:** `CliConfig` (Task 3) is consumed by `cli.ts` (Task 4) using the exact field names (`config.token`, `config.output`, `config.queryString`) defined in Task 3. `ParsedQs` field names in `config.ts` (`hide_title`, `hide_border`, `bg_color`, etc.) match `src/interfaces/interface.ts`'s existing `ParsedQs` class (moved verbatim in Task 2) — verified by cross-checking against `kojilbj/kojilbj`'s current source during plan-writing, not just from memory.
