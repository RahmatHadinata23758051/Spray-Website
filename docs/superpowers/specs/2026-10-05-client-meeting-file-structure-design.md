# Client Meeting Presentation File-Structure Refactor

## Status

Draft for user review. No implementation changes are authorized by this document alone.

## Goal

Restructure `presentation/client-meeting` so CSS, JavaScript, and presentation data are split into maintainable, purpose-specific files while preserving the current appearance and all existing behavior.

The presentation must remain directly launchable by opening `presentation/client-meeting/index.html` in a browser using `file://`. It must not require a dev server, bundler, package installation, framework migration, or network access for application logic/assets.

## Current state and constraints

- Vanilla HTML, CSS, and classic JavaScript; page views are injected into `#page-container`.
- `index.html` loads one stylesheet, one mixed data file, five page scripts, and one shell script through ordered classic script tags.
- `data.js` combines page navigation, decision topics, and the detailed system-map object.
- `styles.css` is approximately 1,400 lines and mixes shell styling with all five page styles.
- `app.js` owns routing, shell controls, presenter notes, decision-detail presentation, and keyboard navigation.
- `pages/system-map.js` owns map rendering, connectors, branch state, map zoom, panel behavior, and resize/layout recalculation.
- Multiple files currently communicate through implicit globals and ordered script loading.
- There are existing uncommitted changes in and outside this presentation. Preserve all pre-existing changes; do not reset or revert unrelated files.

## Design decisions

### Runtime and loading

Keep classic scripts and direct `file://` support. Do not convert the presentation to bare ES modules, add a bundler, or require a local server. `index.html` remains the sole entry point and declares all CSS and scripts in a documented dependency order.

### Shared JavaScript namespace

Create one explicit browser namespace, `window.SpraybotMeeting`, in an early bootstrap script. Split code into plain classic scripts wrapped in small IIFEs or equivalent scoped factories, and attach only intentional public APIs to that namespace.

The namespace exposes only the contracts required between files, for example:

- presentation data: page definitions, decision topics, system-map data;
- page renderers: overview, system map, system context, architecture, decisions;
- shell initialization and route-facing functions;
- map layout recalculation only if shell code truly needs to invoke it.

Do not leave new top-level `let`/`const` bindings or create duplicate global state. Avoid turning the namespace into an indiscriminate dumping ground; each file owns a clear subsystem and exports a narrow surface.

### Proposed directory structure

```text
presentation/client-meeting/
├── index.html
├── assets/
│   └── images/
│       └── spraybot-logo.jpg
├── css/
│   ├── base.css
│   ├── shell.css
│   ├── overview.css
│   ├── system-map.css
│   ├── system-context.css
│   ├── architecture.css
│   └── decisions.css
├── data/
│   ├── pages.js
│   ├── decisions.js
│   └── system-map.js
└── js/
    ├── namespace.js
    ├── shell/
    │   ├── app.js
    │   ├── routing.js
    │   └── presenter-notes.js
    └── pages/
        ├── overview.js
        ├── system-map.js
        ├── system-context.js
        ├── architecture.js
        └── decisions.js
```

`index.html` stays at the root for a stable launch path. The existing logo asset stays local. No image or stylesheet is copied into a second authoritative location.

### File responsibilities

- `base.css`: reset, tokens, font defaults, focus and shared primitives only.
- `shell.css`: header, navigation, footer, shell note panel, and shared page container.
- Each page stylesheet: only rules belonging to that page. Preserve responsive/projector behavior and keep cascade order explicit in `index.html`.
- `pages.js`: presentation route order, titles, and numbering.
- `decisions.js`: decision-topic content.
- `system-map.js` data file: detailed map tree only; keep its name distinct from the renderer file.
- `namespace.js`: initialize the namespace once.
- `shell/app.js`: shell bootstrap and event setup.
- `shell/routing.js`: route selection, page transitions, and previous/next navigation.
- `shell/presenter-notes.js`: browser `localStorage` note persistence and notes panel state. Notes remain browser-persisted; do not reintroduce JSON file picker UI.
- Each `pages/*.js`: that page's rendering and page-specific interactions. Map zoom, connectors, branch toggling, panel detail, and scroll stay in the map page subsystem.

### Compatibility and behavior requirements

Preserve:

- all five client-meeting routes, their order, titles, and active navigation indication;
- ArrowLeft, ArrowRight, and Space presentation navigation;
- page transitions and footer page number;
- presenter notes stored automatically in browser storage, including per-decision-topic separation;
- clicking a decision topic to show its details and notes in the right panel;
- system-map branch expansion, sequential numbering, detail panel, zoom range and readout bounded to 70%-100%, fit behavior, resize handling, and vertical/horizontal scrolling;
- context-diagram connectors and responsive scrolling;
- architecture flow and responsive stacking;
- standalone direct opening through `file://` with relative asset URLs.

Do not redesign visible UI, rewrite content, alter routes, add libraries, or change persistence semantics as part of this refactor.

## Implementation sequence

1. Establish baseline browser behavior and record current routes, key interactions, and console errors at desktop and mobile sizes.
2. Create namespace/bootstrap and split data files; update page consumers while retaining script loading compatibility.
3. Split shell and page scripts into single-responsibility files; wire the explicit load order in `index.html`.
4. Split the large stylesheet into base, shell, and per-page files; preserve effective cascade order.
5. Remove obsolete source files only after all references point to the new files and regression checks pass.
6. Inspect the final diff for accidental content/behavior changes and run the complete browser regression matrix.

## Verification and acceptance

- Directly open `index.html` through `file://`; all CSS, scripts, and local images load.
- No uncaught browser exceptions or failed local resource requests.
- Visit all five routes and verify active navigation, titles, and previous/next controls.
- On Alur Sistem: initial map has no detail panel open; branch click opens detail and expands branch; zoom changes scale and readout within 70%-160%; reset/expand all work; scroll reaches expanded top/bottom; detail panel does not cover nodes.
- On Hal yang Perlu Disepakati: click and keyboard-select topics; topic details appear; notes remain distinct and persist after route navigation/reload.
- On Konteks Sistem: entities and SVG connectors render and are reachable at desktop, tablet, and mobile widths.
- On Arsitektur: all five stages and all deployment options remain visible and responsive.
- Confirm existing viewports around 1568x840, 1024x768, and 390x844.
- `git diff --check` passes; no new dependencies or generated build requirement.
- Compare visible UI before/after; any intentional differences require an explicit decision, otherwise fix them.

## Risks and mitigations

- **Classic-script global collisions:** use namespace-scoped IIFEs and explicit exports; validate every direct-open route.
- **Script-order regressions:** list dependencies and load order in `index.html`; test fresh direct loads and hash navigation.
- **CSS cascade changes:** split by source boundaries and preserve order; compare screenshots at the agreed viewport sizes.
- **Unsaved work in dirty tree:** treat current working changes as user-owned; inspect and preserve them, and report any conflicts rather than reverting them.

## Out of scope

- Framework migration, bundling, module server, or npm dependency changes.
- Visual redesign, copy changes, new presentation features, changing notes storage, or changes to the main Spraybot application outside `presentation/client-meeting`.
