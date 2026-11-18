# Spraybot / Project Paragon — Documentation Hub

```text
Status: Current Handover Reference
Last verified against: 29ad46a
Repository: C:\Users\user\Nata\Project\Spray-paragon\website
GitHub: RahmatHadinata23758051/Spray-Website
```

Welcome to the technical handover documentation for **Spraybot** (Project Paragon). This documentation is designed for incoming engineers, system architects, and laboratory technical leads who need an accurate, production-grade understanding of the system architecture, domain invariants, operator workflows, and integration boundaries.

---

## 1. System Overview

**Spraybot** is a specialized laboratory system developed for the Research & Development (R&D) Packaging division at **Paragon Technology and Innovation**. Its purpose is to digitize, standardize, and automate the physical and visual testing of spray devices—including **aerosol** cans and **non-aerosol** pump bottles.

Spraybot is **not merely a camera viewer or post-processing tool**. It manages the end-to-end testing lifecycle:
1. **Testing Context**: Product lot, study parameters, storage conditions, and formulation metadata under a unified `KodePengujian` context.
2. **Physical Samples**: Tracking individual test units (`Sample`) and their multi-run test repetitions (`TestRun`).
3. **Machine & Physical Measurements**: Machine setpoints (force, stroke, duration) coupled with manual laboratory measurements (initial/final gross weights, initial/final aerosol pressures, leakage status, and drying time).
4. **Visual Capture**: Synchronized camera frame capture, pre-spray baseline extraction, and IndexedDB client-side binary storage.
5. **Computer Vision Analysis**: Plume geometry calculation (spray angle, plume width, spray height) for Side perspective, and pattern distribution analysis for Front perspective.
6. **Immutable Result Finalization**: Enforcing rigorous domain checks (`canFinalizeTestRun`) before generating an unalterable `FinalAnalysisReport`.
7. **Local-First Synchronization**: Zero-downtime offline operation with automatic PostgreSQL database synchronization via Fastify.
8. **Experimental AI Sandbox**: A dedicated Model Testing laboratory (`/uji-model`) for training and validating new YOLO-based plume segmentation weights without disrupting production testing.

---

## 2. Recommended Reading Order

New developers joining the project should follow this sequence to build complete domain context before modifying application code:

| # | Document | Primary Focus | Target Audience |
|---|----------|---------------|-----------------|
| 1 | [HANDOVER.md](./HANDOVER.md) | Executive handover summary, current system maturity, and core rules | All Developers & Leads |
| 2 | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | 3-layer architecture, workspace boundaries, and dependency flows | Architects & Full-Stack Devs |
| 3 | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) | Canonical entities (`KodePengujian` → `Sample` → `TestRun`), lifecycles, and immutability | Domain & Backend Engineers |
| 4 | [OPERATOR_WORKFLOW.md](./OPERATOR_WORKFLOW.md) | 5-step operational wizard, Step 04 sub-workspaces, and Step 05 vs `/result` | Frontend & UX Engineers |
| 5 | [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md) | Directory structure, file mapping ("Where do I edit X?"), and route catalog | All Developers |
| 6 | [DATA_PERSISTENCE_AND_SYNC.md](./DATA_PERSISTENCE_AND_SYNC.md) | LocalStorage metadata, IndexedDB binary storage, and Fastify sync service | Data & Frontend Engineers |
| 7 | [API_AND_DATABASE.md](./API_AND_DATABASE.md) | Fastify endpoints, HttpOnly session auth, Drizzle ORM schema, and JSONB design | Backend Engineers |
| 8 | [CAPTURE_AND_ANALYSIS.md](./CAPTURE_AND_ANALYSIS.md) | Real camera capture, baseline windowing, Side CV engine, and simulation fixtures | CV & Hardware Engineers |
| 9 | [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) | Environment setup, database migrations, seed accounts, and scripts | All Developers |
| 10 | [TESTING_AND_QA.md](./TESTING_AND_QA.md) | Testing strategy across layers, protected invariants, and regression suites | QA & Test Engineers |
| 11 | [OPEN_ITEMS_AND_ROADMAP.md](./OPEN_ITEMS_AND_ROADMAP.md) | Unresolved client questions, pending hardware/CV integrations, and debt | Tech Leads & PMs |

---

## 3. Document Map & Executive Summaries

### [1. HANDOVER.md](./HANDOVER.md)
The primary entry point. Explains why the system exists, what is fully implemented versus simulated, hardware and CV boundaries, and the critical **"Do Not Break" invariant list** governing system behavior.

### [2. SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
Technical breakdown of the npm workspace monorepo (`apps/web`, `apps/api`, `packages/domain`, `packages/contracts`). Covers the Presentation → Application → Domain layered boundaries and provides full Mermaid architecture diagrams.

### [3. DOMAIN_MODEL.md](./DOMAIN_MODEL.md)
Exhaustive reference for domain entities: `KodePengujian` (study context), `Sample` (physical unit), and `TestRun` (execution instance). Documents status lifecycles, parent defaults vs sample overrides (`getEffectiveSampleContext`), and the strict immutability of `FinalAnalysisReport`.

### [4. OPERATOR_WORKFLOW.md](./OPERATOR_WORKFLOW.md)
Details the client-aligned 5-step operational wizard (`01. Identifikasi`, `02. Device`, `03. Parameter`, `04. Eksekusi`, `05. Hasil`). Clarifies how Capture and Analysis function as state-driven sub-workspaces of Step 04 that return to Step 04/05, and contrasts Step 05 with the read-only `/result` historical page.

### [5. CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md)
A structural map of the source tree. Includes a "Where to change what" table and a comprehensive route catalog separating canonical routes, technical sub-workspaces, and legacy redirects.

### [6. DATA_PERSISTENCE_AND_SYNC.md](./DATA_PERSISTENCE_AND_SYNC.md)
Details the hybrid local-first persistence model: LocalStorage for reactive JSON aggregates, IndexedDB (`spraybot.capture-assets.v1`) for raw camera frames and video chunks, and optimistic-locked remote sync via `SyncService` and media manifests.

### [7. API_AND_DATABASE.md](./API_AND_DATABASE.md)
Technical specification of the Fastify REST backend, Argon2id password hashing, cookie-based session tokens, and the PostgreSQL schema managed via Drizzle ORM. Includes an Entity-Relationship (ER) Mermaid diagram and explains the JSONB snapshot strategy.

### [8. CAPTURE_AND_ANALYSIS.md](./CAPTURE_AND_ANALYSIS.md)
Explains camera ingestion (Side physical camera vs simulated Front camera), the real MediaStream / MediaRecorder pipeline, baseline background subtraction (`realSideBaseline`), manual operator frame selection (Primary vs Supporting), and the YOLO model testing sandbox.

### [9. DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
Step-by-step developer onboarding instructions: Node.js/PostgreSQL versions, environment variables (`DATABASE_URL`, `SESSION_SECRET`), schema migration, database seeding, default laboratory login credentials, and development server execution.

### [10. TESTING_AND_QA.md](./TESTING_AND_QA.md)
Overview of the automated quality gates (TypeScript strict typechecking, Vitest unit/integration tests, and Playwright E2E browser tests). Documents critical regression suites that protect wizard progress and finalization immutability.

### [11. OPEN_ITEMS_AND_ROADMAP.md](./OPEN_ITEMS_AND_ROADMAP.md)
Tracks pending client specifications (stroke measurement units, sample replication requirements, D50 droplet sizing, official corporate PDF report layout) and hardware/CV integration roadmaps (PLC Modbus/OPC-UA, production CV service).

---

## 4. Key Project Contacts & Context

- **Client**: PT Paragon Technology and Innovation (R&D Packaging Laboratory).
- **Core Technology Stack**:
  - Frontend: React 18, TypeScript 5.7, Tailwind CSS, Vite.
  - Backend: Fastify 5, TypeScript 5.7, Drizzle ORM 0.38, PostgreSQL.
  - Storage: Browser LocalStorage (JSON) + IndexedDB (ArrayBuffer media).
  - Validation: Pure Domain logic + Zod contracts (`@spray-paragon/contracts`).
  - Model Lab: Python 3.10+, PyTorch, Ultralytics YOLO (`models/segmentation/`).
