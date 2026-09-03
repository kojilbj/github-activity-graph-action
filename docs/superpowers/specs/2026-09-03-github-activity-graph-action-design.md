# github-activity-graph-action: design

## Motivation

`kojilbj/kojilbj` (a GitHub profile README) used to embed its activity graph via
the hosted `github-readme-activity-graph.vercel.app` API. That hosted
deployment started returning `402 DEPLOYMENT_DISABLED`, breaking the badge.

The fix already shipped in `kojilbj/kojilbj`: vendor the graph's rendering
logic (`scripts/activity-graph/`), run it via a GitHub Actions workflow that
regenerates a static SVG and commits it, and reference that committed file
from the README instead of an external API. Along the way, the original
`node-chartist` renderer (which pulled in a 2016-era `jsdom` dependency chain
flagged with 6 `npm audit` vulnerabilities) was replaced with a small,
dependency-free `renderLineChart.ts` that draws a smooth Catmull-Rom-derived
curve through the contribution data.

This spec covers extracting that logic into a standalone, reusable GitHub
Action — `kojilbj/github-activity-graph-action` — so anyone can drop the same
static-SVG approach into their own profile README with a few lines of YAML,
instead of copying source files by hand.

## Non-goals

- No hosted API. The whole point is to avoid depending on always-on
  infrastructure the maintainer has to keep paying for / keep alive.
- No npm publish. GitHub Actions are consumed via `uses: owner/repo@ref`, not
  the npm registry, so there's no separate package-publishing step to
  maintain.
- No attempt at pixel-perfect visual parity with the original
  `github-readme-activity-graph` output. Straight/curved line rendering and
  Y-axis tick placement are close but use a simpler algorithm (see
  `kojilbj/kojilbj`'s existing `renderLineChart.ts` for the prior art this
  extracts).

## Architecture

New repository: `kojilbj/github-activity-graph-action` (public, so it's
`uses:`-able from any workflow).

```
github-activity-graph-action/
├── action.yml               # composite action definition
├── package.json             # axios, moment, dotenv, typescript, ts-node, vitest
├── tsconfig.json
├── src/
│   ├── fetcher.ts           # GraphQL contributions fetch (moved from kojilbj/kojilbj as-is)
│   ├── utils.ts             # query-option parsing + graph assembly (moved as-is)
│   ├── GraphCards.ts        # moved as-is
│   ├── svgs.ts               # moved as-is
│   ├── renderLineChart.ts   # moved as-is, incl. renderLineChart.test.ts
│   ├── interfaces/interface.ts
│   ├── styles/
│   │   ├── themes.ts
│   │   ├── graphStyle.ts
│   │   └── graphAnimation.ts
│   └── cli.ts                # NEW — generalizes kojilbj/kojilbj's generate.ts:
│                              #   reads all config from env vars (mapped 1:1
│                              #   from action.yml inputs), writes the SVG to
│                              #   the requested output path, exits non-zero
│                              #   on a contributions-fetch error instead of
│                              #   emitting an "invalid user" placeholder SVG
├── README.md                  # usage docs + example workflow snippet
└── LICENSE                    # MIT; credits Ashutosh00710/github-readme-activity-graph
                                # as the origin of the rendering approach this
                                # was originally adapted from
```

`action.yml` is a **composite action** (plain shell steps), not a JavaScript
action. The underlying logic is already a working TypeScript CLI
(`ts-node src/cli.ts`, same execution model as `kojilbj/kojilbj`'s existing
`npm run generate:activity-graph`), so a composite action reuses it directly
with no bundler (`@vercel/ncc`) step to maintain.

## `action.yml` inputs

| name | required | default | maps to |
|---|---|---|---|
| `username` | yes | — | GitHub username to render |
| `token` | yes | — | GitHub PAT (`repo` scope) used for the GraphQL contributions query. **Not** used for git push — see "Commit behavior" below |
| `output` | no | `assets/activity-graph.svg` | Path (relative to the checked-out repo) to write the SVG |
| `theme` | no | `default` | Theme name from `styles/themes.ts` |
| `custom_title` | no | — | Overrides the auto-generated `"{name}'s Contribution Graph"` title |
| `hide_title` | no | `false` | Hide the title entirely |
| `hide_border` | no | `false` | Hide the card border |
| `bg_color` | no | — | Overrides the theme's background color (hex, no `#`) |
| `border_color` | no | — | Overrides the theme's border color |
| `area_color` | no | — | Overrides the theme's area-fill color |
| `color` | no | — | Overrides the theme's primary text/line color |
| `line` | no | — | Overrides the theme's line color |
| `point` | no | — | Overrides the theme's point-marker color |
| `title_color` | no | — | Overrides the theme's title color |
| `area` | no | `false` | Show the area fill under the line |
| `grid` | no | `true` | Show grid lines |
| `radius` | no | `0` | Card corner radius, clamped to `[0, 16]` |
| `height` | no | `420` | Card height, clamped to `[200, 600]` |
| `days` | no | `31` | Number of trailing days to plot (ignored if `from`/`to` given) |
| `from` | no | — | Custom range start (`YYYY-MM-DD`); requires `to` |
| `to` | no | — | Custom range end (`YYYY-MM-DD`); requires `from` |
| `commit` | no | `true` | Whether the action commits & pushes the generated SVG |
| `commit_message` | no | `chore: update activity graph` | Commit message used when `commit: true` |
| `git_user_name` | no | `github-actions[bot]` | Commit author name |
| `git_user_email` | no | `github-actions[bot]@users.noreply.github.com` | Commit author email |

Card width stays fixed at `1200` (matches upstream's own behavior; not
exposed as an input — no known use case needs it, YAGNI).

## `action.yml` outputs

| name | description |
|---|---|
| `svg_path` | The path the SVG was written to (echoes `output`) |
| `changed` | `"true"`/`"false"` — whether a new commit was made. Always `"false"` when `commit: false` |

## Data flow

1. Consumer's workflow runs `actions/checkout` (required — this action does
   not check out the repo itself), then `uses: kojilbj/github-activity-graph-action@<ref>`
   with `with:` inputs.
2. Composite action steps:
   a. `actions/setup-node@v4` (Node 20)
   b. `npm ci` with `working-directory: ${{ github.action_path }}` — installs
      *this action's* dependencies, isolated from whatever the consumer's own
      repo has installed
   c. Map every input to an env var (`INPUT_USERNAME` → `GH_USERNAME`, etc.)
      and run `npx ts-node ${{ github.action_path }}/src/cli.ts`. The script
      fetches contributions via GraphQL, renders the SVG, and writes it to
      `output` resolved against `GITHUB_WORKSPACE` (the consumer's checked-out
      repo, not the action's own directory).
   d. If `commit == 'true'`:
      - `git config user.name "$GIT_USER_NAME"` / `user.email "$GIT_USER_EMAIL"`
        in the consumer's checked-out repo
      - `git add "$OUTPUT"` (unconditionally — this also correctly handles
        the very first run, where the file is untracked and a plain
        `git diff` would see no change at all), then
        `git diff --cached --quiet -- "$OUTPUT"` to check whether anything
        is actually staged
      - if changed: `git commit -m "$COMMIT_MESSAGE"`, `git push`; set
        output `changed=true`
      - if unchanged: `git reset -- "$OUTPUT"` (undo the `add`, keep the
        working tree clean), set output `changed=false`, skip commit/push
      - Push authentication reuses whatever credentials the consumer's own
        `actions/checkout` step already persisted (its default behavior with
        `persist-credentials: true`). This action does **not** accept or
        require a separate push token — the consumer's workflow needs
        `permissions: contents: write` for the push to succeed, same as
        `kojilbj/kojilbj`'s existing workflow already does.

## Error handling

- If the GraphQL fetch fails (bad username, rate limit, etc.), `Fetcher`
  today returns an error *string* rather than throwing, and the old
  `generate.ts` threw on that string. `cli.ts` keeps that behavior: throw and
  exit non-zero, failing the Action step visibly, rather than committing an
  "invalid user" placeholder SVG. Silent placeholder commits are worse than a
  red CI check for this use case.
- If `commit: true` but the consumer's workflow lacks `contents: write`
  permission, `git push` fails and the step fails with GitHub's normal error
  output — no special-casing needed.

## Testing plan

- `renderLineChart.test.ts` (vitest, 14 tests covering point count, curve
  smoothness, flat tangents at local extrema, area/grid toggles, axis
  labels) moves over unchanged — pure function, no behavior change from the
  move.
- Manual verification of `cli.ts`: run it locally with env vars set (same
  workflow already used to validate `kojilbj/kojilbj`'s `generate.ts`),
  confirm well-formed SVG output.
- End-to-end dogfooding: once this action works, `kojilbj/kojilbj`'s
  `.github/workflows/activity-graph.yml` switches from its current inline
  implementation to `uses: kojilbj/github-activity-graph-action@main`. This
  is the real integration test — it has to keep producing a working badge on
  an actual profile README.

## Versioning

- Develop against `main`; `kojilbj/kojilbj` points at `@main` during
  development.
- Once the action is stable, tag `v1` and switch `kojilbj/kojilbj` (and the
  README usage example) to `@v1`.

## Attribution

`src/` is adapted from `Ashutosh00710/github-readme-activity-graph` (MIT
licensed). The `LICENSE` file and `README.md` both credit the original
project as the source of the rendering approach and theme palette.
