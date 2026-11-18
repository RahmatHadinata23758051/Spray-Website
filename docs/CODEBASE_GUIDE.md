# CODEBASE GUIDE — Directory Tree, File Maps & Route Catalog

```text
Status: Current Handover Reference
Last verified against: 29ad46a
Repository: C:\Users\user\Nata\Project\Spray-paragon\website
GitHub: RahmatHadinata23758051/Spray-Website
```

This guide provides a physical map of the repository, a quick-reference index for making modifications safely, and the complete route catalog of the frontend application.

---

## 1. Directory Tree Breakdown

```text
Spray-paragon/website/
├── apps/
│   ├── web/                                 # Frontend SPA (React + TypeScript + Vite)
│   │   ├── index.html                       # HTML entry point with root container
│   │   ├── vite.config.ts                   # Vite build & dev server config
│   │   ├── tailwind.config.js               # Design tokens (colors, typography, spacing)
│   │   └── src/
│   │       ├── App.tsx                      # Top-level Router & route declarations
│   │       ├── main.tsx                     # React DOM bootstrap
│   │       ├── application/                 # Use cases, application ports, services
│   │       │   ├── ports/                   # Abstract repository & service interfaces
│   │       │   │   ├── kodePengujianRepository.ts
│   │       │   │   ├── captureAssetStore.ts
│   │       │   │   ├── sideAnalysisEngine.ts
│   │       │   │   ├── simulationService.ts
│   │       │   │   └── sync.ts
│   │       │   ├── sync/
│   │       │   │   └── syncService.ts       # Optimistic sync coordinator & manifest builder
│   │       │   ├── reporting/
│   │       │   │   └── createFinalReportCsv.ts # CSV export serialization
│   │       │   └── services.ts              # Service locator / singleton instances
│   │       ├── data/                        # Concrete data adapters (Hexagonal adapters)
│   │       │   ├── local/
│   │       │   │   ├── kodePengujianRepository.ts # LocalStorage implementation
│   │       │   │   ├── indexedDbCaptureAssetStore.ts # IndexedDB binary store
│   │       │   │   └── batchRepository.ts   # Legacy batch LocalStorage adapter
│   │       │   └── remote/
│   │       │       ├── httpKodePengujianRemoteRepository.ts # HTTP client to API
│   │       │       └── mockCaptureMediaRemoteStore.ts
│   │       ├── presentation/                # UI Presentation Layer
│   │       │   ├── components/              # Shared design system primitives
│   │       │   │   ├── layout/              # AppShell, Sidebar, Header, UserMenu
│   │       │   │   └── ui/                  # Button, Input, Select, Panel, Status, Overlay
│   │       │   ├── features/                # Domain-specific UI widgets
│   │       │   │   └── analysis/            # ResultEvidenceGallery, TechnicalDetailsDisclosure
│   │       │   └── pages/                   # Top-level page views
│   │       │       ├── Login/               # LoginPage.tsx
│   │       │       ├── Dashboard/           # DashboardPage.tsx
│   │       │       ├── KodePengujian/       # CANONICAL TESTING WORKFLOW
│   │       │       │   ├── KodePengujianPage.tsx       # Study context listing
│   │       │       │   ├── NewKodePengujianPage.tsx    # Create new study
│   │       │       │   ├── KodePengujianDetailPage.tsx # Sample & TestRun manager
│   │       │       │   ├── TestExecutionWizardPage.tsx # 5-STEP OPERATIONAL WIZARD
│   │       │       │   ├── TestRunCapturePage.tsx      # Step 04 Capture sub-workspace
│   │       │       │   ├── TestRunAnalysisPage.tsx     # Step 04 Analysis sub-workspace router
│   │       │       │   ├── TestRunRealSideAnalysisWorkspace.tsx # Real camera CV workspace
│   │       │       │   ├── TestRunSimulationAnalysisWorkspace.tsx # Simulation CV workspace
│   │       │       │   ├── TestRunResultPage.tsx       # Read-only historical result view
│   │       │       │   └── wizard/                     # Wizard step child components
│   │       │       │       ├── types.ts                    # Form data model & helpers
│   │       │       │       ├── WizardStepper.tsx           # Step 1-5 progress header
│   │       │       │       ├── Step01Identification.tsx    # Step 1: Study & Sample
│   │       │       │       ├── Step02DeviceConfig.tsx      # Step 2: Packaging specs
│   │       │       │       ├── Step03Parameters.tsx        # Step 3: Setpoints & Objectives
│   │       │       │       ├── Step04ExecutionData.tsx     # Step 4: Machine data & capture
│   │       │       │       └── Step05ResultSummary.tsx     # Step 5: Review & Finalize
│   │       │       ├── ModelTesting/        # MODEL TESTING SANDBOX (/uji-model)
│   │       │       │   ├── ModelTestingListPage.tsx
│   │       │       │   ├── NewModelTestingPage.tsx
│   │       │       │   ├── ModelTestingWizardPage.tsx
│   │       │       │   └── wizard/ (Step01ModelIdent to Step05ModelResult)
│   │       │       ├── Batches/             # Legacy batch fallback screens
│   │       │       ├── Reports/             # ReportsPage.tsx
│   │       │       ├── Products/            # ProductsPage.tsx
│   │       │       ├── Calibration/         # CalibrationPage.tsx
│   │       │       ├── Users/               # UsersPage.tsx
│   │       │       └── Settings/            # SettingsPage.tsx
│   │       └── styles/                      # Tailwind index.css and print styles
│   │
│   └── api/                                 # Backend REST API (Fastify 5 + Drizzle ORM)
│       ├── package.json
│       ├── src/
│       │   ├── app.ts                       # Fastify application factory (`buildApp()`)
│       │   ├── application/
│       │   │   └── ports/                   # AuthRepository, KodePengujianRepository
│       │   ├── data/
│       │   │   └── postgres/
│       │   │       ├── client.ts            # Drizzle PostgreSQL connection pool
│       │   │       ├── schema.ts            # Database table definitions
│       │   │       ├── migrate.ts           # Schema migration runner
│       │   │       ├── seed.ts              # Initial accounts & sample data
│       │   │       └── repositories/        # PostgresAuthRepo, PostgresKodePengujianRepo
│       │   └── presentation/
│       │       ├── middleware/              # Auth session cookie validator, rate limit
│       │       └── routes/
│       │           ├── authRoutes.ts        # /auth/login, /auth/logout, /auth/session
│       │           ├── healthRoutes.ts      # /health
│       │           ├── kodePengujianRoutes.ts # /api/kode-pengujian CRUD & /sync
│       │           ├── modelTestingRoutes.ts # /api/model-testing endpoints
│       │           └── modelRunner.ts       # Subprocess IPC to Python YOLO script
│       └── drizzle/                         # Auto-generated SQL migration files
│
├── packages/
│   ├── domain/                              # Pure Domain Rules & Calculations
│   │   └── src/
│   │       ├── index.ts                     # Public package exports
│   │       ├── kode-pengujian/              # KodePengujian, Sample, TestRun aggregates
│   │       ├── calculations/                # sprayMetrics.ts (Discharged Mass, Rate, etc.)
│   │       ├── analysis/                    # FinalAnalysisReport and CV types
│   │       └── batch/                       # Legacy batch adapter compatibility
│   │
│   └── contracts/                           # Runtime Validation Contracts (Zod)
│       └── src/
│           ├── index.ts                     # Public contract exports
│           ├── kodePengujian.ts             # Create/Update/Read Zod schemas
│           ├── sideAnalysis.ts              # Real Side CV envelope schemas
│           ├── sync.ts                      # Sync aggregate payload & media manifest schemas
│           └── auth.ts                      # Login and session validation schemas
│
└── models/
    └── segmentation/                        # AI Model Testing Assets
        ├── spraybot_seg_video_finetuned.pt  # Fine-tuned YOLO segmentation weights
        └── infer.py                         # Single-frame inference CLI
```

---

## 2. "Where to Look to Change X" — Developer File Map

Use this table to immediately identify which files to modify for common engineering tasks:

| Developer Task | Primary Files to Modify | Invariants & Tests to Verify |
|----------------|-------------------------|------------------------------|
| **Add a new field to `KodePengujian`** | 1. `packages/domain/src/kode-pengujian/index.ts`<br/>2. `packages/contracts/src/kodePengujian.ts`<br/>3. `apps/api/src/data/postgres/schema.ts`<br/>4. `apps/web/src/presentation/pages/KodePengujian/NewKodePengujianPage.tsx` | Run `npm run typecheck`, verify `kode_pengujian.test.ts` and `contracts.test.ts`. |
| **Add a new field to `Sample`** | 1. `packages/domain/src/kode-pengujian/index.ts` (`Sample` interface & `addSample`)<br/>2. `packages/contracts/src/kodePengujian.ts`<br/>3. `apps/api/src/data/postgres/schema.ts`<br/>4. `apps/web/src/presentation/pages/KodePengujian/wizard/` | Ensure `getEffectiveSampleContext()` honors parent fallback if sample field is unset. |
| **Modify the 5-Step Wizard UI** | `apps/web/src/presentation/pages/KodePengujian/wizard/`<br/>- `Step01Identification.tsx`<br/>- `Step02DeviceConfig.tsx`<br/>- `Step03Parameters.tsx`<br/>- `Step04ExecutionData.tsx`<br/>- `Step05ResultSummary.tsx`<br/>- `types.ts` | Verify `evaluateWizardProgress()` step gating in `operational_wizard.test.tsx`. |
| **Add a physical measurement field** | 1. `packages/domain/src/kode-pengujian/index.ts` (`ExecutionMeasurements`)<br/>2. `apps/web/src/presentation/pages/KodePengujian/wizard/types.ts`<br/>3. `apps/web/src/presentation/pages/KodePengujian/wizard/Step04ExecutionData.tsx` | Pure formulas must be updated if the measurement affects derived metrics. |
| **Update spray calculation formulas** | `packages/domain/src/calculations/sprayMetrics.ts` | Update `packages/domain/src/__tests__/sprayMetrics.test.ts`. Must round deterministically. |
| **Adjust Side camera capture settings** | `apps/web/src/presentation/pages/KodePengujian/TestRunCapturePage.tsx`<br/>`apps/web/src/presentation/pages/Batches/realCapture.ts` | Verify frame cleanup, IndexedDB storage, and baseline window selection. |
| **Modify CV measurement overlays** | `apps/web/src/presentation/pages/KodePengujian/TestRunRealSideAnalysisWorkspace.tsx`<br/>`apps/web/src/presentation/pages/KodePengujian/TestRunSimulationAnalysisWorkspace.tsx` | Verify Canvas DPI scaling and overlay coordinate mapping. |
| **Update remote sync payload structure** | 1. `packages/contracts/src/sync.ts`<br/>2. `apps/web/src/application/sync/syncService.ts`<br/>3. `apps/api/src/presentation/routes/kodePengujianRoutes.ts` | Ensure media binaries are never embedded in JSON payload; use media manifest. |
| **Add or update backend API routes** | `apps/api/src/presentation/routes/`<br/>`apps/api/src/app.ts` | Ensure `authMiddleware.requireAuth()` is called; validate input with Zod contracts. |
| **Modify database schema or tables** | `apps/api/src/data/postgres/schema.ts`<br/>Run `npm run db:generate`<br/>Run `npm run db:migrate` | Verify Drizzle ORM foreign keys, indexes, and JSONB type definitions. |
| **Update session security or cookies** | `apps/api/src/presentation/routes/authRoutes.ts`<br/>`apps/api/src/app.ts` | Cookie must remain `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 28800`. |
| **Add a new model testing feature** | `apps/web/src/presentation/pages/ModelTesting/`<br/>`apps/api/src/presentation/routes/modelTestingRoutes.ts`<br/>`apps/api/src/presentation/routes/modelRunner.ts` | Run `npx vitest run apps/web/src/__tests__/model_testing.test.tsx`. |

---

## 3. Application Route Catalog

The web frontend uses `react-router-dom` v6, configured in `apps/web/src/App.tsx`.

### A. Canonical Laboratory Workflow Routes

These represent the primary operational workflow used by laboratory operators:

| Path | Component | Description & Access Purpose |
|------|-----------|------------------------------|
| `/dashboard` | `DashboardPage` | Overview of recent test studies, rapid quick actions, system mode status. |
| `/kode-pengujian` | `KodePengujianPage` | Full table-first directory of all test studies, filterable by product, status, and operator. |
| `/kode-pengujian/new` | `NewKodePengujianPage` | Setup wizard for a new `KodePengujian` study context. |
| `/kode-pengujian/:kpId` | `KodePengujianDetailPage` | Master study dashboard: manage physical Samples, view TestRuns, trigger new runs. |
| `/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute` | `TestExecutionWizardPage` | **The 5-Step Operational Testing Wizard** (Steps 01 to 05). Active testing execution. |
| `/reports` | `ReportsPage` | Multi-test analysis comparison, historical reports directory, and batch CSV export. |
| `/products` | `ProductsPage` | Laboratory product formulations catalog and reference test recipes. |
| `/calibration` | `CalibrationPage` | Optical camera calibration, pixel-to-millimeter scale factors, and spatial alignment. |
| `/users` | `UsersPage` | User directory and role management (operator, analyst, admin). |
| `/settings` | `SettingsPage` | Laboratory preferences, device presets, and local cache management. |

### B. Technical Sub-Workspace Routes

These are modal, high-focus engineering workspaces launched directly from **Step 04** of the operational wizard:

| Path | Component | Navigation & Return Contract |
|------|-----------|------------------------------|
| `/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/capture` | `TestRunCapturePage` | Camera capture workspace (Real USB capture or Simulation mode). When called with `?returnTo=wizard`, exiting returns to Step 04 (`execute?step=4`). |
| `/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/analysis` | `TestRunAnalysisPage` | Routes dynamically to `TestRunRealSideAnalysisWorkspace` (for real captures) or `TestRunSimulationAnalysisWorkspace` (for simulations). When called with `?returnTo=wizard`, clicking "Lanjut ke Hasil" returns to Step 05 (`execute?step=5`). |

### C. Historical Inspection Route

| Path | Component | Usage Guard |
|------|-----------|-------------|
| `/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/result` | `TestRunResultPage` | **Read-only historical view**. Displays the finalized immutable report, evidence gallery, and technical disclosures. Accessible from `KodePengujianDetailPage`. Cannot be used to edit tests. |

### D. Model Testing Sandbox Routes (`/uji-model`)

A dedicated sandbox for evaluating new CV models without touching production data:

| Path | Component | Purpose |
|------|-----------|---------|
| `/uji-model` | `ModelTestingListPage` | List of manual spray video segmentation test sessions. |
| `/uji-model/new` | `NewModelTestingPage` | Upload manual test video (MP4/MOV) and configure segmentation parameters. |
| `/uji-model/:testId/execute` | `ModelTestingWizardPage` | 5-step model evaluation wizard with YOLO inference preview and mask overlays. |

### E. Legacy Batch Routes & Backward Compatibility Redirects

Spraybot maintains 100% backward compatibility for legacy MVP test batches:

| Route | Handling | Destination |
|-------|----------|-------------|
| `/batches` | `BatchesPage` | Legacy batch list (renders adapted batches via `adaptBatchToKodePengujian`). |
| `/batches/new` | `NewBatchPage` | Legacy batch creation form. |
| `/batches/:batchId` | `BatchDetailPage` | Legacy batch detail view. |
| `/new-test` | Redirect | Navigate to `/batches/new` |
| `/history` | Redirect | Navigate to `/batches` |
| `/capture` | Redirect | Navigate to `/batches` |
| `/analysis` | Redirect | Navigate to `/batches` |
| `/result` | Redirect | Navigate to `/batches` |

---

## 4. Technical Debt & Codebase Watchouts

Incoming engineers should be aware of these design nuances:
1. **Dual Storage Keys**: The frontend maintains two primary LocalStorage keys: `spraybot.kodePengujian.v1` (canonical) and `spraybot.batches.v1` (legacy). The repository adapter (`adaptBatchToKodePengujian`) automatically merges legacy records into memory so they remain visible.
2. **IndexedDB Private Mode Fallback**: If the operator opens Spraybot in a browser private window where IndexedDB is blocked, `IndexedDbCaptureAssetStore` falls back to an in-memory `Map<string, StoredCaptureAsset>`. Frames will be held in RAM until the tab is closed.
3. **Model Testing Payload Size**: The inference endpoint (`/api/model-testing/infer-frame`) transmits raw base64 frames over HTTP. Fastify's body limit is configured to 25 MB (`bodyLimit: 25 * 1024 * 1024`) to handle high-resolution 4K frames.
