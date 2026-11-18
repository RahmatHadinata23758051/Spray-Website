# HANDOVER — Executive System Handover & Engineering Reference

```text
Status: Current Handover Reference
Last verified against: 29ad46a
Repository: C:\Users\user\Nata\Project\Spray-paragon\website
GitHub: RahmatHadinata23758051/Spray-Website
```

This document serves as the master engineering handover for the **Spraybot** (Project Paragon) codebase. It is written for incoming senior software engineers, system architects, and technical project managers. It provides an honest, code-verified account of the system's purpose, architectural maturity, hard technical invariants, and development boundaries.

---

## 1. Product Purpose & Problem Context

In cosmetic and personal care product development at **PT Paragon Technology and Innovation**, spray packaging (such as deodorants, face mists, body sprays, and hairsprays) must undergo rigorous physical and visual testing to ensure consistent dosing, optimal plume geometry, and consumer satisfaction.

Historically, this testing involved disconnected manual spreadsheets, handheld scales, pressure gauges, and qualitative visual inspection.

**Spraybot** is a unified, software-first laboratory platform engineered to:
- Establish a rigorous study context via **Kode Pengujian** (linking formulation lot, study period, and storage conditions).
- Manage individual physical test bottles (**Samples**) and track multiple testing repetitions (**TestRuns**) per sample.
- Capture actuator machine setpoints (pneumatic force in N, stroke depth in mm, press holding time in ms).
- Capture real-time high-speed Side camera footage and extract pre-spray background baseline frames.
- Run deterministic fixture simulation for dual-camera analysis (Side geometry and Front pattern).
- Allow laboratory operators to review computer vision results, adjust measurement baselines, and select primary and supporting evidence frames.
- Ingest physical measurements (pre/post gross bottle weights, pre/post aerosol pressures, leakage status, and drying time).
- Automatically calculate derived operational metrics (**Discharged Mass**, **Discharge Rate**, **Pressure Drop**) via pure, deterministic formulas.
- Seal finalized tests into an **immutable analysis report** (`FinalAnalysisReport`).
- Provide offline-first resilience through browser **IndexedDB** and **LocalStorage**, with background synchronization to **PostgreSQL**.
- Provide a dedicated **Model Testing Sandbox** (`/uji-model`) to benchmark and evaluate new YOLO plume segmentation models (`spraybot_seg_video_finetuned.pt`) on manual test videos without disrupting operational workflows.

> [!IMPORTANT]
> **Spraybot is NOT merely a camera viewer or an image processing script.** It is a comprehensive laboratory information and testing execution system. UI components do not interact with raw hardware or database connections directly; all state and transitions flow through strict domain contracts.

---

## 2. Current System Maturity Matrix

The codebase reflects a production-grade software MVP with simulated machine hardware. The matrix below defines the exact implementation status of each system component:

| Subsystem / Capability | Current Status | Implementation Details |
|------------------------|----------------|------------------------|
| **KodePengujian / Sample / TestRun Domain** | **Production-Ready** | Canonical domain hierarchy in `packages/domain/src/kode-pengujian/`, protected by pure functions and invariant checks. |
| **5-Step Operational Wizard** | **Production-Ready** | State-driven workflow (`01. Identifikasi` to `05. Hasil`) with reactive validation, live metric calculations, and step navigation guards. |
| **Step 04 Sub-Workspaces** | **Production-Ready** | Seamless transition to Capture (`TestRunCapturePage`) and Analysis (`TestRunAnalysisPage`), with guaranteed return paths to wizard Step 04/05. |
| **Side Plume Analysis (Simulation)** | **Production-Ready** | Deterministic simulation across 4 scenarios (`nominal-01`, `direction-offset-01`, `pattern-asymmetry-01`, `alignment-review-01`). |
| **Side Plume Analysis (Real Capture)** | **Partially Integrated** | Real browser MediaStream capture, frame extraction into IndexedDB, baseline selection, and browser-side heuristic contour geometry engine (`SideAnalysisEngine`). |
| **Front Pattern Analysis** | **Simulated Only** | Front camera hardware does not exist in prototype. Dual-camera analysis exists only in simulation mode. Real capture explicitly disables Front analysis. |
| **Model Testing Sandbox (`/uji-model`)** | **Functional Lab** | Upload manual spray video, run frame-by-frame inference via local Python YOLO runner (`models/segmentation/infer.py`), and review plume masks. |
| **Result Finalization & Immutability** | **Production-Ready** | Strict validation (`canFinalizeTestRun`), immutable `FinalAnalysisReport` snapshot, automatic recalculation of derived operational metrics. |
| **Hybrid Local-First Persistence** | **Production-Ready** | Metadata stored in LocalStorage (`spraybot.kodePengujian.v1`); media binaries stored in IndexedDB (`spraybot.capture-assets.v1`). |
| **Remote Database Synchronization** | **Production-Ready** | Optimistic locking sync service pushing aggregate payloads and media manifests to Fastify `/api/kode-pengujian/:id/sync` → PostgreSQL. |
| **Authentication & Authorization** | **Production-Ready** | Fastify backend with Argon2id password hashing, SHA-256 session token hashing, HttpOnly session cookies, and role-based access (`operator`, `analyst`, `admin`). |
| **Physical Machine Hardware (Actuator / PLC)** | **Hardware Pending** | Hardware does not exist yet. Actuator motion, pneumatic valves, and PLC triggers are simulated in UI. |
| **Industrial Camera Trigger** | **Hardware Pending** | Currently captures via standard browser WebRTC / USB camera (`navigator.mediaDevices.getUserMedia`). Hardware sync pulses do not yet exist. |
| **Production CV Microservice** | **Future Integration** | Python inference exists for sandbox; production Side analysis currently runs via browser Canvas heuristics. |
| **Official Corporate PDF Export** | **Client-Dependent** | Client has not yet finalized official R&D signatory and layout template. CSV export is fully implemented. |
| **Sample Replication Semantics** | **Client-Dependent** | System supports arbitrary TestRuns per Sample; client has not defined mandatory repetition counts for statistical sign-off. |

---

## 3. "Do Not Break" — The 6 Cardinal System Invariants

When extending or maintaining Spraybot, you must strictly uphold the following invariants. Any commit that violates these rules will introduce regressions or data corruption:

### Rule 1: Finalized Result Immutability
Once an operator finalizes a test in Wizard Step 05 (`finalizeTestRun`):
- The `TestRun` status permanently transitions to `FINALIZED`.
- The parent `Sample` status transitions to `TESTED`.
- An immutable `FinalAnalysisReport` is attached to the `TestRun`.
- The test run **can never be re-finalized, edited, or deleted**.
- Any future attempt to modify setpoints, measurements, or drafts on a finalized test run will throw a `DomainInvariantError`.

### Rule 2: Pure Domain Calculation Authority
- Derived operational metrics (**Discharged Mass**, **Discharge Rate**, **Pressure Drop**) must **never** be manually input by the operator or trusted from client-supplied draft payloads.
- They must strictly be calculated by the pure domain functions in `packages/domain/src/calculations/sprayMetrics.ts`.
- Upon finalization, `finalizeTestRun()` forcefully recalculates all derived metrics directly from the raw physical measurements (`initialGrossWeightG`, `finalGrossWeightG`, `actualPressDurationS`, etc.).

### Rule 3: 5-Step Operational Wizard Contract
The client-facing testing workflow has exactly 5 numbered stages:
1. `01. Identifikasi` — Sample identification, formula, lot, test period, and storage context.
2. `02. Device` — Packaging specification (Aerosol vs Non-Aerosol components).
3. `03. Parameter` — Test parameters (stroke, force, press duration/holding time, observation objectives).
4. `04. Eksekusi` — Machine execution, actual measurement inputs, and access to Capture/Analysis sub-workspaces.
5. `05. Hasil` — Comprehensive result review, live operational metrics summary, readiness check, and immutable finalization.

> **Capture and Analysis are NOT extra wizard steps.** They are modal sub-workspaces launched from Step 04. When an operator finishes capture or analysis, the sub-workspaces **MUST return to Wizard Step 04 or Step 05**, never to the historical `/result` page.

### Rule 4: Separation of Step 05 and `/result`
- **Wizard Step 05 (`Step05ResultSummary.tsx`)**: Used during active testing. Displays editable draft context, verifies finalization readiness via `canFinalizeTestRun()`, and exposes the primary "Finalisasi Hasil Pengujian" action button.
- **Result Page (`/result` / `TestRunResultPage.tsx`)**: A read-only historical inspection view accessed from the `KodePengujian` detail view. If the test run is not yet finalized, it displays a warning and forbids report editing.

### Rule 5: Hybrid Local-First Persistence & Binary Isolation
- **Metadata**: JSON structures are stored in browser LocalStorage (`spraybot.kodePengujian.v1`) and synced to PostgreSQL.
- **Media Binaries**: High-resolution camera frames and video recordings are stored exclusively in browser IndexedDB (`spraybot.capture-assets.v1`).
- **PostgreSQL Database Isolation**: Raw video and image binary blobs are **NEVER** stored directly in PostgreSQL database columns. PostgreSQL stores only structured metadata, results snapshots, and the `media_references` manifest.

### Rule 6: Anti-AI Slop & Technical Design Discipline
The visual and interactive design is strictly bound by `docs/DESIGN.md`:
- **Reject AI Aesthetic Slop**: No decorative linear gradients, no translucent glassmorphism, no exaggerated rounded corners (`rounded-3xl`), no decorative floating icon cards, no glowing shadows, and no gratuitous animations.
- **Embrace Technical Utility**: Clean technical laboratory typography, table-first data presentations, high-density layouts, subtle bordered panels, purposeful measurement overlays, and high-contrast status tokens.

---

## 4. Hardware Reality & Simulation Boundaries

To avoid misleading stakeholders or future engineers, understand what exists in the physical world:

```mermaid
flowchart TD
    subgraph Real Laboratory Environment
        PhysicalBottle["Physical Sample Bottle (Aerosol / Pump)"]
        Operator["Laboratory Operator"]
        Scale["Analytical Scale (Manual Readout)"]
        Gauge["Pressure Gauge (Manual Readout)"]
        USBCam["Standard USB / WebRTC Camera (Side Only)"]
    end

    subgraph Spraybot Software MVP
        AppWeb["React Web Application (Vite)"]
        CapturePage["TestRunCapturePage (MediaStream Capture)"]
        IndexedDB[("IndexedDB (spraybot.capture-assets.v1)")]
        AnalysisEngine["SideAnalysisEngine (Plume Contour)"]
        SimService["SimulationService (Deterministic Fixtures)"]
    end

    subgraph Future Physical Integrations
        PLC["PLC Actuator Controller (Hardware Pending)"]
        PneumaticValve["Pneumatic Test Stand (Hardware Pending)"]
        FrontCam["Industrial Front Pattern Camera (Hardware Pending)"]
        EdgeCV["Edge CV Inference Server (Future)"]
    end

    Operator -- "Reads Mass (g)" --> Scale
    Operator -- "Reads Pressure (bar)" --> Gauge
    Operator -- "Inputs Manual Data" --> AppWeb
    USBCam -- "Video Stream" --> CapturePage
    CapturePage -- "Extracts Frames & Video" --> IndexedDB
    IndexedDB -- "Loads Frames" --> AnalysisEngine

    SimService -. "Simulates Dual-Camera Fixtures" .-> AppWeb
    AppWeb -. "PENDING INTEGRATION" .-. PLC
    AppWeb -. "PENDING INTEGRATION" .-. PneumaticValve
    AppWeb -. "PENDING INTEGRATION" .-. FrontCam
    AnalysisEngine -. "FUTURE MIGRATION" .-. EdgeCV
```

- **Actuator Hardware**: No automated actuator test stand is currently connected. When the operator clicks "Mulai Pengambilan Data", the software triggers browser-based recording timers.
- **Camera Configuration**: Physical testing only features a **Side camera**. The **Front camera** does not physically exist on the testing rig; front pattern analysis is only available via simulation fixtures.
- **Physical Measurements**: Scale weights and pressure values are read manually by the operator from laboratory bench instruments and typed into the Step 04 form.

---

## 5. How to Safely Continue Development

If you are tasked with adding a new feature or fixing an issue:
1. **Follow the Reading Order**: Read `SYSTEM_ARCHITECTURE.md`, `DOMAIN_MODEL.md`, and `OPERATOR_WORKFLOW.md` before making changes.
2. **Consult the File Map**: Check `CODEBASE_GUIDE.md` to identify the correct files to modify.
3. **Run Quality Gates**: Always run `npm run typecheck`, `npm run lint`, and targeted tests (`npm run test`) before submitting code.
4. **Respect Layers**: Never import database drivers or server code into `apps/web`. Never put UI code in `packages/domain`.
5. **Protect Invariants**: Verify that `packages/domain/src/__tests__/` and `apps/web/src/__tests__/` pass completely.
