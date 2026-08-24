# Contributing to Cytoscape Web

Cytoscape Web is an open source project, and we greatly appreciate any and all contributions.

Whether you want to fix a bug, add a feature, improve the documentation, or simply report a problem, your help is welcome. Our goal is to make Cytoscape Web easy to use and comprehensive. Thank you for taking the time and effort to contribute and to help make that happen!

Please also review our [Code of Conduct](CODE_OF_CONDUCT.md) — we expect everyone participating in the community to follow it.

## Submitting issues

The first step towards a code contribution is usually [a short, descriptive issue](https://github.com/cytoscape/cytoscape-web/issues).

When filing an issue:

- Describe the bug or feature you are addressing.
- For bugs, include steps to reproduce, the expected behaviour, and the actual behaviour. Screenshots, console output, and the browser/OS you are using are all helpful.
- If it relates to a specific network or file, a minimal example that reproduces the problem makes it far easier for us to help.

If you're not sure what to work on, take a look at the open issues — anything labelled [`help wanted`](https://github.com/cytoscape/cytoscape-web/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) or [`good first issue`](https://github.com/cytoscape/cytoscape-web/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) is a good starting point. Of course, we also welcome your own ideas.

## Getting set up

Cytoscape Web is a React + TypeScript application built with Vite tooling.

```sh
npm install     # install dependencies
npm run dev     # start the dev server (opens at http://localhost:5500)
```

Node's expected version is pinned in [`.nvmrc`](.nvmrc); using `nvm use` will select it for you.

## Making your changes in a pull request

Development happens on the `development` branch, which is the default and the target for most changes. Releases are promoted from `development` to `master`. Please branch off of `development` and open your pull request against it unless a maintainer directs you otherwise.

To propose a change:

1. [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the `cytoscape-web` repository on GitHub.
2. Create a topic branch off of `development`.
3. Make your change, keeping commits focused and their messages descriptive.
4. Push your branch and open a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) so the proposed changes can be reviewed.

The codebase follows a strict three-layer architecture — models, stores, and features. Please try to keep your changes consistent with the existing structure. For a deeper overview of the architecture, conventions, and directory layout, see [`CLAUDE.md`](CLAUDE.md) and the specifications under [`docs/specifications/`](docs/specifications/).

If your change affects behaviour, please update the relevant documentation as well.

## Code style

Cytoscape Web is written in TypeScript. Formatting and linting are enforced automatically:

- **Formatting** is handled by Prettier: no semicolons, single quotes, trailing commas, 2-space indentation, and an 80-character line width.
- **Linting** is handled by ESLint, including import sorting (lint errors will fail the build).

You can run the tooling from the terminal, or enable Prettier/ESLint support in your editor:

```sh
npm run lint        # check for lint errors
npm run lint:fix    # auto-fix lint errors
npm run format      # format code with Prettier
```

The most important thing is that your code is easy to read and understand, and consistent with the code around it. A couple of conventions worth calling out:

- Use the structured `debug` logger from `src/debug.ts` (`logStore`, `logUi`, etc.) rather than `console.log`.
- Use functional React components — no class components — and rely on the new JSX transform (do not add `import React from 'react'`).

## Testing

Unit tests (Vitest) are co-located with the source files they cover. End-to-end tests (Playwright) live in `test/playwright/`.

- If your change is a bugfix, please add a test case that would fail without your fix.
- If your change is a new feature, please add tests accordingly.
- If your change is visual/rendering-related where an automated test isn't pragmatic, describe how you verified it in the pull request.

Run the checks before opening your pull request:

```sh
npm run test:checks   # lint + unit tests, in parallel
npm run e2e:spec -- <spec-name>   # the e2e specs covering your change
npm test              # lint, unit, and the full Chromium e2e run
```

Every test script has a `:quiet` variant that prints failures and a summary
only — handy for CI logs, and required of AI agents working in this repo. A
full local e2e run is refused unless `CYWEB_FULL_E2E=1` is set; CI runs the
whole suite on your PR. See [AGENTS.md](AGENTS.md) §5 for the complete command
reference — it is the source of truth, and this section deliberately does not
duplicate it.

Please make sure the tests are passing before you submit your pull request. If you're unsure why something is failing, open the pull request anyway and note what you've tried — we're happy to help.
