# Spraybot — Automated Spray Device Testing & Plume Analysis Platform

> **Industrial R&D Laboratory Testing & Packaging Quality Assurance System**  
> Developed for **PT Paragon Technology and Innovation** (Packaging Research & Development Division).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black?logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-fcc72b?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50-45ba4b?logo=playwright)](https://playwright.dev/)

---

## 1. Executive Overview

**Spraybot** is a software-first laboratory platform engineered to standardize, capture, analyze, and verify the performance of cosmetic and personal care spray packaging. It supports both **aerosol cans** (deodorants, hairsprays, body sprays) and **non-aerosol pump bottles** (face mists, serums, setting sprays).

Spraybot replaces fragmented manual spreadsheets and qualitative observations with an integrated testing ecosystem:
- **Study Context Management**: Anchors every test to an authoritative `KodePengujian` record capturing product formulation lot numbers, study periods, storage conditions, and R&D objectives.
- **Sample & Run Tracking**: Tracks multiple physical bottles (`Sample`) and supports multiple consecutive actuation trials (`TestRun`) per sample for statistical replication.
- **Physical & Machine Data**: Bridges actuator machine setpoints (stroke depth, actuation force, holding time) with laboratory bench measurements (pre/post gross weights, pre/post aerosol pressures, leakage status, and drying time).
- **High-Speed Visual Ingestion**: Captures high-frame-rate Side camera video via WebRTC/USB, isolates pre-spray background baselines, and stores media in client-side IndexedDB.
- **Computer Vision Plume Analysis**: Extracts plume geometry (cone angle, spray width, plume height) and pattern distributions, allowing operator review and baseline calibration.
- **Pure Operational Calculations**: Deterministically calculates **Discharged Mass** ($\Delta m$), **Discharge Rate** ($R$), and **Pressure Drop** ($\Delta P$) using pure domain formulas.
- **Guaranteed Result Immutability**: Seals finalized test runs into an unalterable `FinalAnalysisReport` snapshot.
- **Offline-First Resilience**: Full offline operational capability using browser LocalStorage and IndexedDB, backed by an optimistic synchronization worker pushing to a central PostgreSQL database via Fastify.
- **Model Testing Sandbox (`/uji-model`)**: An isolated evaluation environment to benchmark fine-tuned YOLO plume segmentation models (`models/segmentation/spraybot_seg_video_finetuned.pt`) on manual test videos without contaminating production test data.

---

## 2. System Architecture

Spraybot is organized as an npm workspaces monorepo enforcing clean layered architecture (Presentation → Application → Domain & Contracts):

```mermaid
flowchart TD
    subgraph Monorepo ["Monorepo Structure"]
        subgraph WebApp ["apps/web (Frontend)"]
            ReactUI["React 18 + Vite SPA"]
            Wizard["5-Step Operational Wizard"]
            IndexedDBStore[("IndexedDB: spraybot.capture-assets.v1")]
            LocalMetaStore[("LocalStorage: spraybot.kodePengujian.v1")]
        end

        subgraph BackendAPI ["apps/api (Backend)"]
            FastifyServer["Fastify 5 REST Server (:3001)"]
            SessionAuth["Argon2id + HttpOnly Cookies"]
            SyncHandler["Optimistic Sync Endpoint"]
            PythonBridge["ModelRunner (Python YOLO IPC)"]
        end

        subgraph SharedPackages ["packages/ (Shared Contracts & Business Rules)"]
            Domain["@spray-paragon/domain<br/>(Pure Entities, Calculations & Invariants)"]
            Contracts["@spray-paragon/contracts<br/>(Zod Runtime Validation Schemas)"]
        end

        subgraph StorageLayer ["Central Persistence"]
            PostgreSQL[("PostgreSQL Database<br/>(Drizzle ORM Tables + JSONB)")]
        end
    end

    ReactUI --> Domain
    ReactUI --> Contracts
    FastifyServer --> Domain
    FastifyServer --> Contracts

    ReactUI <--> LocalMetaStore
    ReactUI <--> IndexedDBStore
    ReactUI -->|"POST /api/kode-pengujian/:id/sync<br/>(Metadata + Media Manifest)"| FastifyServer
    FastifyServer <--> PostgreSQL
```

---

## 3. Developer Handover Documentation Hub

Comprehensive, production-grade engineering handover documentation is located in the [`docs/`](./docs/README.md) directory. Incoming developers and technical leads should follow the recommended reading order below:

| # | Document | Primary Contents & Focus |
|---|----------|--------------------------|
| 1 | [docs/README.md](./docs/README.md) | Documentation index, system overview, and reading order guide. |
| 2 | [docs/HANDOVER.md](./docs/HANDOVER.md) | **Executive Handover**: System purpose, maturity matrix, and the **6 "Do Not Break" Cardinal Rules**. |
| 3 | [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) | **Monorepo Architecture**: Layer boundaries, application ports & adapters, and Mermaid diagrams. |
| 4 | [docs/DOMAIN_MODEL.md](./docs/DOMAIN_MODEL.md) | **Core Domain**: `KodePengujian` → `Sample` → `TestRun` hierarchy, lifecycles, and finalization immutability. |
| 5 | [docs/OPERATOR_WORKFLOW.md](./docs/OPERATOR_WORKFLOW.md) | **User Journey**: The client's 5-step wizard, Step 04 sub-workspaces, and Step 05 vs `/result` distinction. |
| 6 | [docs/CODEBASE_GUIDE.md](./docs/CODEBASE_GUIDE.md) | **Codebase Map**: "Where to look to change X" file table, route catalog, and technical debt. |
| 7 | [docs/DATA_PERSISTENCE_AND_SYNC.md](./docs/DATA_PERSISTENCE_AND_SYNC.md) | **Persistence**: LocalStorage metadata, IndexedDB binary storage, and PostgreSQL sync manifests. |
| 8 | [docs/API_AND_DATABASE.md](./docs/API_AND_DATABASE.md) | **Backend & DB**: Fastify REST routes, Argon2id auth, Drizzle ORM schema, and JSONB design. |
| 9 | [docs/CAPTURE_AND_ANALYSIS.md](./docs/CAPTURE_AND_ANALYSIS.md) | **Vision & Ingestion**: Real USB camera capture, baseline windowing, and simulation fixtures. |
| 10 | [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) | **Developer Runbook**: Local environment onboarding, database setup, migrations, and seeds. |
| 11 | [docs/TESTING_AND_QA.md](./docs/TESTING_AND_QA.md) | **Quality Assurance**: Multi-tiered test pyramid, critical regression test suites, and invariants. |
| 12 | [docs/OPEN_ITEMS_AND_ROADMAP.md](./docs/OPEN_ITEMS_AND_ROADMAP.md) | **Roadmap**: Unresolved client questions, pending PLC hardware, and production CV deployment. |

---

## 4. Key Workflows & Features

### 5-Step Client Operational Wizard
Testing is conducted through a structured 5-step workflow matching Paragon's standard testing protocol:
1. `01. Identifikasi`: Configure study lot, formulation number, sample codes, storage conditions, and test objectives.
2. `02. Device`: Select packaging type (Aerosol vs Non-Aerosol) and specify actuator, pump, valve, and propellant codes.
3. `03. Parameter`: Set actuator machine setpoints (stroke depth in mm, actuation force in N, holding duration in s).
4. `04. Eksekusi`: State-driven execution hub launching camera capture and analysis sub-workspaces while collecting physical measurements.
5. `05. Hasil`: Review final operational metrics, verify finalization readiness (`canFinalizeTestRun`), and permanently seal the test.

### Sub-Workspaces & Navigation Safety
- **Capture Sub-Workspace** (`TestRunCapturePage.tsx`): Manages video/frame acquisition. Returning routes safely back to Wizard Step 04.
- **Analysis Sub-Workspace** (`TestRunAnalysisPage.tsx`): Evaluates plume geometry and pattern contours. Completing analysis routes safely to **Wizard Step 05**.
- **Historical Result View** (`TestRunResultPage.tsx`): A strictly read-only inspection screen for finalized tests accessed from study summaries, decoupled from the active wizard.

### Binary Media Isolation
Raw video and frame binaries are stored exclusively in browser IndexedDB (`spraybot.capture-assets.v1`). Database synchronization transmits structured metadata accompanied by a **Media Manifest** (`RemoteMediaDescriptor[]`), guaranteeing that high-volume binary blobs never pollute PostgreSQL tables.

---

## 5. Quickstart & Local Setup

### Prerequisites
- **Node.js**: `>= 20.10.0` (Recommended: Node 22 LTS)
- **npm**: `>= 10.0.0`
- **PostgreSQL**: `>= 14.0` (Running locally)
- **Python** *(Optional)*: `>= 3.10` with PyTorch & Ultralytics (only if executing local YOLO inference)

### 1. Clone & Install
```bash
git clone https://github.com/RahmatHadinata23758051/Spray-Website.git
cd Spray-Website
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```ini
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spraybot_dev
SESSION_SECRET=spraybot-paragon-local-development-secret-key-32chars
API_PORT=3001
VITE_API_URL=http://localhost:3001
```

### 3. Initialize Database
```bash
# Generate SQL migrations (if schema updated)
npm run db:generate

# Apply migrations to local PostgreSQL
npm run db:migrate

# Seed default administrator account
npm run db:seed
```

### 4. Run Development Servers
```bash
# Starts both Frontend (:5173) and Fastify API (:3001) concurrently:
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Fastify REST API**: `http://localhost:3001`
- **API Health Check**: `http://localhost:3001/health`

---

## 6. Quality Gates & Test Suites

The repository enforces strict automated quality gates. All checks must pass before merging code:

```bash
# Run TypeScript typechecks across all 4 workspaces
npm run typecheck

# Run ESLint across web and API code
npm run lint

# Run unit, contract, and domain tests (Vitest)
npm run test

# Run production Vite and Fastify builds
npm run build

# Run Playwright browser end-to-end regression tests
npx playwright test
```

### Default Development Credentials
- **Full-Stack (PostgreSQL)**:
  - Email: `admin@local.test`
  - Password: `change-me-local-only` (or `SEED_ADMIN_PASSWORD` in `.env`)
- **Frontend Standalone (Mock Mode)**:
  - Email: `operator@local.test`
  - Password: `spraybot123`

---

## 7. License & Internal Notice

This software is proprietary and confidential to **PT Paragon Technology and Innovation**. Developed for internal laboratory testing, research, and packaging development. Unauthorized copying, distribution, or external disclosure is strictly prohibited.
