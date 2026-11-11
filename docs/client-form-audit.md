# Client Form Domain Audit — Spraybot / Project Paragon
**Source Document**: `C:\Users\user\Downloads\Spray_Device_Analysis.html`  
**Target Repository**: `C:\Users\user\Nata\Project\Spray-paragon\website`  
**Date**: November 2026 (Revision 2 — Rigorous Source-Aligned Audit)  
**Status**: AUDIT REVISED — STRICTLY NO IMPLEMENTATION PERFORMED  

---

## 1. Executive Summary

This document presents a revised, strictly evidence-based audit of the client prototype form `Spray_Device_Analysis.html` provided by Paragon Technology and Innovation. This revision removes any external assumptions or speculative enums introduced in earlier passes and adheres rigorously to the exact labels, values, units, and structures present in the client HTML.

### Methodological Discipline: Separation of Truth
To prevent architectural contamination, all findings are categorized into four tiers:
1. **Explicit Client Facts (Source of Truth)**: Verbatim labels, dropdown values, button groups, and script logic found directly in `Spray_Device_Analysis.html`.
2. **Likely Inferences**: Engineering deductions based on standard cosmetic/aerosol testing practices (e.g. `No. Batch` meaning chemical formulation lot code, stroke depth unit being mm). Every inference is explicitly labeled as such.
3. **Architectural Recommendations**: Spraybot system designs to accommodate client workflows cleanly (e.g., parent-default with Sample-override pattern, JSONB snapshot objects for setpoints).
4. **Unresolved Questions**: Genuine ambiguities that cannot be resolved without direct written clarification from Paragon.

---

## 2. Client Workflow

The client HTML implements a 5-step single-page wizard with navigation buttons (`Previous`, `Next Step >`), a top progress bar (`1. Sample Information`, `2. Device Configuration`, `3. Test Parameters`, `4. Manual Data Entry`, `5. Results & Summary`), and client-side JavaScript execution:

```
[01 / Sample Identification]
             │
             ▼
[02 / Device Configuration]
  ├── [Aerosol] ───────────► Can/Bottle, Valve, Actuator, Gas Ratio, Gas Type, Initial Pressure, Initial Weight
  └── [Non-Aerosol] ───────► Bottle, Pump, Initial Weight
             │
             ▼
[03 / Test Parameters]
  ├── Observation Objectives (5 Checkboxes)
  └── Gaya Tekan Mode
        ├── [Normal] ──────► Setting Gaya Tekan Normal (Dropdown), Durasi Tekan, Tinggi Botol (mm), Luas Aktuator (mm2), Stroke (mm)
        └── [Tidak Normal] ► Setting Gaya Tekan (Manual N), Durasi Tekan, Tinggi Botol (mm), Luas Aktuator (mm2), Stroke (mm)
             │
             ▼
[04 / Manual Data Entry]
  ├── Kebocoran (Ya/Tidak), Tekanan Setelah (bar), Bobot Akhir Bruto (g)
  ├── Durasi Tekan Aktual (s), Kedalaman Stroke Aktual (s) [Unit Anomaly]
  └── Waktu Pengeringan (s), Droplet D50 (um), Panjang Lintasan (cm), Sebaran (cm), Sudut Kontak (deg), Catatan Pengamatan
             │
             ▼
[05 / Results & Summary]
  ├── KPI Cards: Discharged Mass (g), Discharge Rate (g/s), Pressure Drop (bar)
  ├── Summary Table: Product, Trial, Device, Usage, Leakage, Objectives
  └── Action Bar: Export CSV / Excel, Export PDF, Add Replication (rep++), Save Draft (localStorage)
```

### Script Calculations & Lifecycle Events
- **Summary Calculation** (`summary()` in lines 550–571):
  $$\text{Discharged Mass} = m_{\text{awal}} - m_{\text{akhir}} \quad (\text{HTML: } \texttt{nv('w0') - nv('w1')})$$
  $$\text{Discharge Rate} = \frac{\text{Discharged Mass}}{t_{\text{aktual}}} \quad (\text{HTML: } \texttt{dur ? mass / dur : 0})$$
  $$\text{Pressure Drop} = P_{\text{awal}} - P_{\text{akhir}} \quad (\text{HTML: } \texttt{nv('pb') - nv('pa')})$$
- **Replication Loop** (`addReplication()` in lines 602–605):
  Increments counter `rep` by 1 and navigates back to Step 1 (`go(0)`).
- **Draft Persistence** (`saveDraft()` in lines 606–616):
  Dumps all input values and checkbox states directly into browser `localStorage` under the key `sprayDeviceDraft`.

---

## 3. Verbatim Field Inventory

The following table extracts every single control from `Spray_Device_Analysis.html` using the **verbatim label, exact default/options in the file, and exact unit**:

| # | Exact Client Label | UI Step | Input Type | Verbatim Default / Options in HTML | Source Stated in HTML | Conditional Visibility | Unit | Classification Tier |
|---|--------------------|:-------:|:----------:|-----------------------------------|:---------------------:|------------------------|:----:|:-------------------:|
| 1 | `Nama Produk` | 01 | text | `value="Manual"` (placeholder id `product`) | Manual | Always visible | — | Explicit Fact |
| 2 | `No. Formula` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 3 | `No. Batch` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 4 | `KUF` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 5 | `Tanggal Pengambilan Data` | 01 | date/text | `value="auto"` | Auto | Always visible | — | Explicit Fact |
| 6 | `Tujuan Trial` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 7 | `Posisi Penyimpanan(Dropdown)` | 01 | dropdown/text | `value="Tegak/Tidur "` | Manual | Always visible | — | Explicit Fact |
| 8 | `Kondisi Penyimpanan (Dropdown)` | 01 | dropdown/text | `value="Ruang/Jemur/Display/Oven 40/Oven 45/Oven 50/Oven 60/Freezer/Siklus"` | Manual | Always visible | — | Explicit Fact |
| 9 | `Benchmark` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 10 | `Jenis Trial` | 01 | button group | `Lab`, `PS`, `MP` (Default: `Lab`) | Manual | Always visible | — | Explicit Fact |
| 11 | `Kode unik sampel` | 01 | text | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 12 | `Pola Penggunaan` | 01 | button group | `Sekali Pakai`, `Berulang` (Default: `Sekali Pakai`) | Manual | Always visible | — | Explicit Fact |
| 13 | `Jenis Device` | 02 | button group | `Aerosol`, `Non-Aerosol` (Default: `Aerosol`) | Manual | Always visible | — | Explicit Fact |
| 14 | `Kode Aktuator` (Aerosol) | 02 | text | `value="Manual"` | Manual | Aerosol only | — | Explicit Fact |
| 15 | `Kode Kaleng / Botol` | 02 | text | `value="Manual"` | Manual | Aerosol only | — | Explicit Fact |
| 16 | `Kode Valve` | 02 | text | `value="Manual"` | Manual | Aerosol only | — | Explicit Fact |
| 17 | `Rasio Gas` | 02 | text | `value="Manual"` | Manual | Aerosol only | — | Explicit Fact |
| 18 | `Jenis Gas` | 02 | text | `value="Manual"` | Manual | Aerosol only | — | Explicit Fact |
| 19 | `Tekanan Awal (bar)` | 02 | text/number | `value="Manual"` | Manual | Aerosol only | bar | Explicit Fact |
| 20 | `Bobot Awal Bruto (g)` (Aerosol) | 02 | text/number | `value="Auto"` | Auto | Aerosol only | g | Explicit Fact |
| 21 | `Kode Botol` | 02 | text | `value="Manual"` | Manual | Non-Aerosol only | — | Explicit Fact |
| 22 | `Kode Pump` | 02 | text | `value="Manual"` | Manual | Non-Aerosol only | — | Explicit Fact |
| 23 | `Bobot Awal Bruto (g)` (Non-Aerosol)| 02 | text/number | `value="Auto"` | Auto | Non-Aerosol only | g | Explicit Fact |
| 24a | `Panjang lintasan` (Objective) | 03 | checkbox | `checked` | Manual | Always visible | — | Explicit Fact |
| 24b | `Sebaran` (Objective) | 03 | checkbox | `checked` | Manual | Always visible | — | Explicit Fact |
| 24c | `Sudut kontak` (Objective) | 03 | checkbox | unchecked | Manual | Always visible | — | Explicit Fact |
| 24d | `Kecepatan pengeringan` (Objective) | 03 | checkbox | unchecked | Manual | Always visible | — | Explicit Fact |
| 24e | `Distribusi droplet` (Objective) | 03 | checkbox | unchecked | Manual | Always visible | — | Explicit Fact |
| 25 | `Gaya Tekan` (Mode Toggle) | 03 | button group | `Normal`, `Tidak Normal` (Default: `Normal`) | Manual | Always visible | — | Explicit Fact |
| 26a | `Setting Gaya Tekan Normal(N) (Dropdown)` | 03 | dropdown/text | `value="List Dropdown dapat di ubah atau di tambah oleh administrator"` | Preset Dropdown | Normal force only | N | Explicit Fact |
| 26b | `Setting Gaya Tekan(N)` | 03 | text/number | `value="Manual"` | Manual | Tidak Normal force only | N | Explicit Fact |
| 27 | `Setting Durasi Tekan (s) (holding time)` | 03 | text/number | `value="Manual"` | Manual | Always visible (both modes) | s | Explicit Fact |
| 28 | `Tinggi Botol (mm)` | 03 | text/number | `value="Manual"` | Manual | Always visible (both modes) | mm | Explicit Fact |
| 29 | `Luas Aktuator (mm2)` | 03 | text/number | `value="Manual"` | Manual | Always visible (both modes) | mm² | Explicit Fact |
| 30 | `Setting Tinggi Tekan / Stroke (mm)` | 03 | text/number | `value="Manual"` | Manual | Always visible (both modes) | mm | Explicit Fact |
| 31 | `Kebocoran (Dropdown)` | 04 | dropdown/text | `value="Ya/Tidak"` | Manual | Always visible | — | Explicit Fact |
| 32 | `Tekanan Setelah pengujian (bar)` | 04 | text/number | `value="Manual"` | Manual | Rendered unconditionally | bar | Explicit Fact |
| 33 | `Bobot Akhir Bruto (g)` | 04 | text/number | `value="Auto"` | Auto | Always visible | g | Explicit Fact |
| 34 | `Durasi Tekan Aktual (s) (holding time)` | 04 | text/number | `value="Auto"` | Auto | Always visible | s | Explicit Fact |
| 35 | `Kedalaman Stroke Aktual (s)` | 04 | text/number | `value="Auto"` | Auto | Always visible | (s) [Unit Anomaly] | Explicit Fact (Anomaly) |
| 36 | `Waktu Pengeringan (s)` | 04 | text/number | `value="Manual"` | Manual | Always visible | s | Explicit Fact |
| 37 | `Ukuran Droplet D50 (um)` | 04 | text/number | `value="auto"` | Auto | Always visible | µm | Explicit Fact |
| 38 | `Panjang Lintasan (cm)` | 04 | text/number | `value="auto"` | Auto | Always visible | cm | Explicit Fact |
| 39 | `Diameter Sebaran (cm)` | 04 | text/number | `value="auto"` | Auto | Always visible | cm | Explicit Fact |
| 40 | `Sudut Kontak (deg)` | 04 | text/number | `value="auto"` | Auto | Always visible | deg | Explicit Fact |
| 41 | `Catatan Pengamatan` | 04 | text/textarea | `value="Manual"` | Manual | Always visible | — | Explicit Fact |
| 42 | `Discharged Mass` | 05 | metric card | `0.000 g` | Derived | Always visible | g | Explicit Fact |
| 43 | `Discharge Rate` | 05 | metric card | `0.000 g/s` | Derived | Always visible | g/s | Explicit Fact |
| 44 | `Pressure Drop` | 05 | metric card | `0.00 bar` | Derived | Rendered unconditionally | bar | Explicit Fact |

---

## 4. Separation of Facts, Inferences, Recommendations & Ambiguities

### A. Explicitly Confirmed Client Facts
1. **Bottle Height Unit is Millimeters (`mm`)**: The HTML verbatim states `Tinggi Botol (mm)`. It is **NOT** centimeters.
2. **Leakage is Binary (`Ya/Tidak`)**: The HTML verbatim defines `Kebocoran (Dropdown)` with option string `"Ya/Tidak"`. It does not contain severity states (`Rembesan Halus`, `Bocor Signifikan`).
3. **`Tinggi Botol` is Not `Jarak Target`**: The client form has no mention of target distance or standoff distance; it explicitly asks for `Tinggi Botol (mm)`.
4. **Observation Objectives are 5 Specific Named Flags**:
   - `Panjang lintasan`
   - `Sebaran`
   - `Sudut kontak`
   - `Kecepatan pengeringan`
   - `Distribusi droplet`
5. **Storage Position Options**: Exactly `"Tegak/Tidur "`.
6. **Storage Condition Options**: Exactly `"Ruang/Jemur/Display/Oven 40/Oven 45/Oven 50/Oven 60/Freezer/Siklus"`.
7. **Trial Type Options**: Exactly `Lab`, `PS`, `MP` (representing Laboratory, Pilot Scale, and Manufacturing/Mass Production).

### B. Likely Inferences (Marked for Validation)
1. **`No. Batch`**: In cosmetic manufacturing, `No. Batch` typically identifies the chemical bulk batch or production lot. It is **inferred** to be a descriptive lot string, not an internal software session.
2. **`Kedalaman Stroke Aktual (s)` Unit Anomaly**: In mechanical engineering, stroke depth is distance ($mm$). The unit `(s)` is almost certainly a typographical copy-paste error from the preceding holding time field.
3. **`Tekanan Setelah pengujian` on Non-Aerosol**: In the HTML script, `Pressure Drop` is computed unconditionally (`nv('pb') - nv('pa')`). For non-aerosol pumps, pressure drop is physically meaningless, and the inputs are left unpopulated.

### C. Architectural Recommendations
1. **Parent-Default with Sample-Override Pattern**: Storage condition (`Ruang`, `Oven 40`, etc.) and storage position (`Tegak`, `Tidur`) should be set once at the `KodePengujian` level as campaign defaults, but physically overridden at the `Sample` level if distinct bottles are aged under different conditions.
2. **Structured Snapshotting over Flat Columns**: Setpoints (Gaya Tekan, Holding Time, Tinggi Botol, Luas Aktuator, Stroke) must be captured as an immutable JSON snapshot on the `TestRun` to guarantee forensic auditability even if admin presets change.
3. **Derived Metrics as Pure Functions**: `Discharged Mass`, `Discharge Rate`, and `Pressure Drop` should be implemented as pure calculation utilities, validated in memory, and stored in `FinalAnalysisReport` upon test completion.

### D. Unresolved Questions
1. Is `Kedalaman Stroke Aktual` confirmed to be in millimeters ($mm$)?
2. Does `Sudut Kontak (deg)` mean Plume Cone Angle (*Sudut Semprot*) or surface liquid wetting angle?
3. Does `Diameter Sebaran (cm)` refer to Side-view plume vertical thickness or Front-view circular pattern diameter?
4. How are "Auto" values (`Bobot Awal/Akhir`, `Durasi Tekan Aktual`, `Droplet D50`) acquired in Phase 1 (manual operator entry with hardware hooks vs mock simulation)?

---

## 5. Revised Field Ownership & Lifecycle Analysis

### Lifecycle Principles
- **`KodePengujian`**: Study/campaign context that remains constant across all samples and test repetitions (formula, product, study objectives, default storage).
- **`Sample`**: Physical container specimen context (unique bottle serial, specific packaging BOM, specimen-specific storage override).
- **`TestRun`**: Single actuation cycle / repetition (execution timestamp, snapshotted setpoints, initial/final weights, pressures, actual transducer readings, leakage, notes).
- **`FinalAnalysisReport`**: Derived calculations ($\Delta m$, Rate, $\Delta P$) and accepted CV/optical measurements.

```
┌─────────────────────────────────────────────────────────────┐
│                       KodePengujian                         │
│  - Nama Produk                                              │
│  - No. Formula                                              │
│  - No. Batch (Descriptive Lot Code)                         │
│  - KUF                                                      │
│  - Tujuan Trial                                             │
│  - Benchmark                                                │
│  - Jenis Trial (Lab / PS / MP)                              │
│  - Default Posisi Penyimpanan (Tegak / Tidur)               │
│  - Default Kondisi Penyimpanan (Ruang / Oven / etc.)        │
│  - Protocol Observation Objectives (5 Flags)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                           Sample                            │
│  - Kode unik sampel (SN-...)                                │
│  - Pola Penggunaan (Sekali Pakai / Berulang)                │
│  - Override Posisi Penyimpanan (Optional)                   │
│  - Override Kondisi Penyimpanan (Optional)                  │
│  - Jenis Device (Aerosol / Non-Aerosol)                     │
│  - Packaging Spec (Kaleng/Botol, Valve/Pump, Actuator, Gas) │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                          TestRun                            │
│  - Tanggal Pengambilan Data (Execution Timestamp)           │
│  - Setpoints Snapshot (Gaya, Durasi, Tinggi, Luas, Stroke)  │
│  - Initial Readings: Bobot Awal Bruto, Tekanan Awal         │
│  - Final Readings: Bobot Akhir Bruto, Tekanan Setelah       │
│  - Transducer Actuals: Durasi Tekan Aktual, Stroke Aktual   │
│  - Physical Observations: Kebocoran (Ya/Tidak), Waktu Kering│
│  - Catatan Pengamatan                                       │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      CaptureSession          │ │    FinalAnalysisReport     │
│  - Video asset references    │ │  - Discharged Mass (g)     │
│  - Frame asset references    │ │  - Discharge Rate (g/s)    │
│  - High-speed timestamps     │ │  - Pressure Drop (bar)     │
│                              │ │  - Ukuran Droplet D50      │
│                              │ │  - Panjang Lintasan (cm)   │
│                              │ │  - Diameter Sebaran (cm)   │
│                              │ │  - Sudut Kontak / Semprot  │
└──────────────────────────────┘ └────────────────────────────┘
```

### Analysis of Ambiguous Lifecycle Fields

#### 1. `Tanggal Pengambilan Data`
- *In HTML*: Step 01 field with default `value="auto"`.
- *Lifecycle Reality*: In an R&D laboratory, a `KodePengujian` study might be opened on Monday, but individual physical samples and test runs are executed over multiple days or weeks.
- *Ownership Decision*: 
  - `KodePengujian.createdAt` captures campaign creation.
  - `TestRun.executedAt` captures the exact actuation timestamp.
  - An explicit operator-confirmed date field belongs on **`TestRun`** (or inherited from study if all testing occurs on the same day).

#### 2. `Posisi Penyimpanan` & `Kondisi Penyimpanan`
- *In HTML*: Step 01 fields.
- *Lifecycle Reality*: Often an entire batch of samples is conditioned in the same oven (e.g. `Oven 40` / `Tegak`). However, stability studies routinely compare 3 bottles stored upright (`Tegak`) against 3 bottles stored horizontally (`Tidur`), or room temperature vs oven 40°C under the **same** formula campaign.
- *Ownership Decision*: **Parent-Default with Sample-Override**:
  - `KodePengujian` holds `defaultStoragePosition` and `defaultStorageCondition`.
  - `Sample` has optional `storagePosition` and `storageCondition` overrides.
  - `TestRun` snapshots the effective values at test time.

#### 3. `Observation Objectives` (5 Checkboxes)
- *In HTML*: Step 03 section titled `Observation Objectives` with 5 checkboxes.
- *Lifecycle Reality*: Defines the testing mandate (what the camera and operator are evaluating).
- *Ownership Decision*:
  - Master protocol defined on `KodePengujian` (study protocol).
  - Inherited and active during each `TestRun` actuation.

---

## 6. Revised Field Ownership Table

Recalculated ownership counts across all 44 client controls and derived metrics:

| Field Name (Exact Client Label) | Assigned Owner | Storage / Modeling Pattern | Justification & Lifecycle Scope |
|---|:---:|:---:|---|
| `Nama Produk` | `KodePengujian` | Typed Column | Shared study context across all bottles and runs. |
| `No. Formula` | `KodePengujian` | Typed Column | Formulation identifier constant across study. |
| `No. Batch` | `KodePengujian` | Typed Column (`lotNumberCandidate`) | Descriptive chemical bulk lot code. |
| `KUF` | `KodePengujian` | Typed Column | Formula uniqueness code constant across study. |
| `Tujuan Trial` | `KodePengujian` | Typed Column | R&D trial purpose constant across study. |
| `Benchmark` | `KodePengujian` | Typed Column | Reference comparison product constant across study. |
| `Jenis Trial` (`Lab`/`PS`/`MP`) | `KodePengujian` | Typed Enum Column | Trial category for the entire campaign. |
| `Posisi Penyimpanan` (Default) | `KodePengujian` | Typed Enum Column | Study-level baseline storage orientation (`Tegak`/`Tidur`). |
| `Kondisi Penyimpanan` (Default) | `KodePengujian` | Typed Enum Column | Study-level baseline environmental conditioning. |
| `Observation Objectives` (5 flags) | `KodePengujian` | JSONB Array / Bitmask | Study testing protocol flags. |
| `Kode unik sampel` | `Sample` | Typed Column (`sampleCode`) | Barcode/serial identifying the physical specimen bottle. |
| `Pola Penggunaan` | `Sample` | Typed Enum Column | Declares if bottle is single-use or cycle-tested. |
| `Posisi Penyimpanan` (Override) | `Sample` | Optional Typed Enum Column | Overrides study default if bottle tested under varied position. |
| `Kondisi Penyimpanan` (Override) | `Sample` | Optional Typed Enum Column | Overrides study default if bottle tested under varied condition. |
| `Jenis Device` (`Aerosol`/`Non-Aerosol`) | `Sample` | Typed Enum Column | Hardware package architecture for the physical container. |
| `Kode Kaleng / Botol` | `Sample` | JSONB Packaging Component | Bill-of-materials container part code. |
| `Kode Valve` / `Kode Pump` | `Sample` | JSONB Packaging Component | Bill-of-materials dispensing mechanism code. |
| `Kode Aktuator` | `Sample` | JSONB Packaging Component | Bill-of-materials nozzle actuator code. |
| `Rasio Gas` | `Sample` | JSONB Packaging Component | Formulation propellant ratio (Aerosol only). |
| `Jenis Gas` | `Sample` | JSONB Packaging Component | Propellant type (Aerosol only). |
| `Tanggal Pengambilan Data` | `TestRun` | Timestamp Column (`acquisitionDate`) | Execution date when test actuation was actually conducted. |
| `Gaya Tekan Mode` (`Normal`/`Tidak Normal`) | `TestRun` | Typed Enum Column | Testing regime mode for actuation. |
| `Setting Gaya Tekan Normal(N)` | `TestRun` | JSONB Setpoint Snapshot | Preset force setpoint selected from admin master data. |
| `Setting Gaya Tekan(N)` | `TestRun` | JSONB Setpoint Snapshot | Manual override force setpoint in Newtons. |
| `Setting Durasi Tekan (s)` | `TestRun` | JSONB Setpoint Snapshot | Setpoint holding duration in seconds. |
| `Tinggi Botol (mm)` | `TestRun` | JSONB Setpoint Snapshot | Measured physical bottle height in millimeters. |
| `Luas Aktuator (mm2)` | `TestRun` | JSONB Setpoint Snapshot | Actuator contact surface area in mm². |
| `Setting Tinggi Tekan / Stroke (mm)` | `TestRun` | JSONB Setpoint Snapshot | Target vertical actuator travel in millimeters. |
| `Tekanan Awal (bar)` | `TestRun` | Numeric Column | Pre-actuation pressure gauge reading (Aerosol). |
| `Bobot Awal Bruto (g)` | `TestRun` | Numeric Column | Pre-actuation container weight on analytical balance. |
| `Kebocoran (Dropdown)` (`Ya/Tidak`) | `TestRun` | Boolean / String Column | Post-actuation visual check of valve/pump seal integrity. |
| `Tekanan Setelah pengujian (bar)` | `TestRun` | Numeric Column | Post-actuation pressure gauge reading (Aerosol). |
| `Bobot Akhir Bruto (g)` | `TestRun` | Numeric Column | Post-actuation container weight on analytical balance. |
| `Durasi Tekan Aktual (s)` | `TestRun` | Numeric Column | Actual duration actuator remained pressed down. |
| `Kedalaman Stroke Aktual` | `TestRun` | Numeric Column (`actualStrokeDepth`) | Actual displacement travel (unit pending client verification). |
| `Waktu Pengeringan (s)` | `TestRun` | Numeric Column | Measured drying time on test coupon in seconds. |
| `Catatan Pengamatan` | `TestRun` | Text Column | Free-text operator remarks on spray anomalies. |
| `Discharged Mass` | `FinalAnalysisReport` | Derived Metric / Column | $\Delta m = m_{\text{awal}} - m_{\text{akhir}}$ ($g$). |
| `Discharge Rate` | `FinalAnalysisReport` | Derived Metric / Column | $R = \Delta m / t_{\text{aktual}}$ ($g/s$). |
| `Pressure Drop` | `FinalAnalysisReport` | Derived Metric / Column | $\Delta P = P_{\text{awal}} - P_{\text{akhir}}$ ($bar$, Aerosol only). |
| `Panjang Lintasan (cm)` | `FinalAnalysisReport` | Optical Metric / Column | Spray plume axial penetration distance from nozzle. |
| `Diameter Sebaran (cm)` | `FinalAnalysisReport` | Optical Metric / Column | Plume spread width / pattern diameter. |
| `Sudut Kontak (deg)` | `FinalAnalysisReport` | Optical Metric / Column | Measured plume angle / contact angle. |
| `Ukuran Droplet D50 (um)` | `FinalAnalysisReport` | Particle Metric / Column | Mass median droplet diameter ($D_{50}$) in $\mu m$. |

### Summary of Recalculated Ownership Counts
- **`KodePengujian`**: **10** fields (Study headers, defaults, and objectives protocol)
- **`Sample`**: **10** fields (Bottle identity, device type, packaging BOM, storage overrides)
- **`TestRun`**: **17** fields (Execution date, force mode, 5 setpoints, 2 initial actuals, 2 final actuals, 2 transducer actuals, leakage, drying, remarks)
- **`FinalAnalysisReport` / Result**: **7** fields (3 derived KPIs + 4 optical/droplet measurements)
- **Total Semantic Fields Modeled**: **44** fields.

---

## 7. Precise Database Impact Strategy

To avoid schema bloat while guaranteeing strict typing and query performance, fields are partitioned into **Typed Primary Columns**, **JSONB Snapshots**, and **Admin Master Tables**.

### Principle: Not Every Field Needs a Dedicated SQL Column
- Critical relational identifiers and filterable attributes (e.g. `product_name`, `sample_code`, `device_type`, `execution_date`, weights) are given **typed top-level columns**.
- Configuration sets with variable schemas (such as packaging BOMs which differ completely between Aerosol and Non-Aerosol, and actuator setpoint snapshots) are stored as structured **JSONB objects**.
- Presets that can be managed by administrators (e.g. Normal force list) are stored in an **Admin Master Reference table**.

### Table Alterations (PostgreSQL Additive DDL)

#### 1. `kode_pengujian` Table (Additive Columns)
```sql
ALTER TABLE kode_pengujian
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS formula_number text,
  ADD COLUMN IF NOT EXISTS lot_number text,             -- "No. Batch" in client form
  ADD COLUMN IF NOT EXISTS kuf text,
  ADD COLUMN IF NOT EXISTS trial_objective text,       -- "Tujuan Trial" in client form
  ADD COLUMN IF NOT EXISTS benchmark text,
  ADD COLUMN IF NOT EXISTS trial_type text,            -- 'Lab', 'PS', 'MP'
  ADD COLUMN IF NOT EXISTS default_storage_position text DEFAULT 'Tegak', -- 'Tegak', 'Tidur'
  ADD COLUMN IF NOT EXISTS default_storage_condition text DEFAULT 'Ruang',
  ADD COLUMN IF NOT EXISTS observation_objectives jsonb DEFAULT '["Panjang lintasan", "Sebaran"]'::jsonb;
```

#### 2. `samples` Table (Additive Columns)
```sql
ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS sample_code text,           -- "Kode unik sampel"
  ADD COLUMN IF NOT EXISTS usage_pattern text DEFAULT 'Sekali Pakai', -- 'Sekali Pakai', 'Berulang'
  ADD COLUMN IF NOT EXISTS storage_position text,      -- Optional override
  ADD COLUMN IF NOT EXISTS storage_condition text,     -- Optional override
  ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'Aerosol', -- 'Aerosol', 'Non-Aerosol'
  ADD COLUMN IF NOT EXISTS packaging_components jsonb DEFAULT '{}'::jsonb;
  -- Structure of packaging_components:
  -- Aerosol:     { canOrBottleCode, valveCode, actuatorCode, gasRatio, gasType }
  -- Non-Aerosol: { bottleCode, pumpCode }
```

#### 3. `test_runs` Table (Additive Columns)
```sql
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS acquisition_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS force_mode text DEFAULT 'Normal', -- 'Normal', 'Tidak Normal'
  ADD COLUMN IF NOT EXISTS setpoints_snapshot jsonb DEFAULT '{}'::jsonb,
  -- Structure of setpoints_snapshot:
  -- {
  --   forceSetpointN: number,
  --   pressDurationSetpointS: number,
  --   bottleHeightMm: number,       -- STRICTLY mm as per client HTML
  --   actuatorAreaMm2: number,
  --   strokeDepthSetpointMm: number
  -- }
  -- Physical Measurements & Readings
  ADD COLUMN IF NOT EXISTS initial_pressure_bar real,
  ADD COLUMN IF NOT EXISTS initial_gross_weight_g real,
  ADD COLUMN IF NOT EXISTS final_pressure_bar real,
  ADD COLUMN IF NOT EXISTS final_gross_weight_g real,
  ADD COLUMN IF NOT EXISTS actual_press_duration_s real,
  ADD COLUMN IF NOT EXISTS actual_stroke_depth real, -- unit pending clarification
  ADD COLUMN IF NOT EXISTS leakage text DEFAULT 'Tidak', -- 'Ya', 'Tidak'
  ADD COLUMN IF NOT EXISTS drying_time_s real,
  ADD COLUMN IF NOT EXISTS observation_notes text;
```

#### 4. `final_results` Table (Additive Columns)
```sql
ALTER TABLE final_results
  -- Derived Metrics
  ADD COLUMN IF NOT EXISTS discharged_mass_g real,
  ADD COLUMN IF NOT EXISTS discharge_rate_g_per_s real,
  ADD COLUMN IF NOT EXISTS pressure_drop_bar real,
  -- Optical & Droplet Measurements
  ADD COLUMN IF NOT EXISTS travel_length_cm real,     -- "Panjang Lintasan (cm)"
  ADD COLUMN IF NOT EXISTS spread_diameter_cm real,   -- "Diameter Sebaran (cm)"
  ADD COLUMN IF NOT EXISTS contact_angle_deg real,    -- "Sudut Kontak (deg)"
  ADD COLUMN IF NOT EXISTS droplet_d50_um real;       -- "Ukuran Droplet D50 (um)"
```

#### 5. Master Reference Data Table (New Table)
```sql
CREATE TABLE IF NOT EXISTS test_parameter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- e.g. 'normal_force_n', 'storage_condition'
  label text NOT NULL,
  numeric_value real,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## 8. Terminology Reconciliation Table

| Exact Client HTML Label | Spraybot Proposed Internal Key | Classification | Reconciliation Notes |
|---|---|:---:|---|
| `Nama Produk` | `productName` | DIRECT MATCH | Direct 1:1 match. |
| `No. Formula` | `formulaNumber` | DIRECT MATCH | Direct 1:1 match. |
| `No. Batch` | `lotNumberCandidate` | LIKELY INFERENCE | Descriptive batch/lot code from factory; distinct from Spraybot's legacy session entity. |
| `KUF` | `kuf` | DIRECT MATCH | Formula identification acronym; direct 1:1 match. |
| `Tanggal Pengambilan Data` | `acquisitionDate` | DIRECT MATCH | Form date; stored at TestRun execution. |
| `Tujuan Trial` | `trialObjective` | DIRECT MATCH | Study purpose; stored on KodePengujian. |
| `Posisi Penyimpanan(Dropdown)` | `storagePosition` | DIRECT MATCH | Values: `Tegak`, `Tidur`. Defaulted on KP, overridable on Sample. |
| `Kondisi Penyimpanan (Dropdown)`| `storageCondition` | DIRECT MATCH | Values: `Ruang`, `Jemur`, `Display`, `Oven 40`, `Oven 45`, `Oven 50`, `Oven 60`, `Freezer`, `Siklus`. |
| `Benchmark` | `benchmark` | DIRECT MATCH | Competitor or control product code. |
| `Jenis Trial` | `trialType` | DIRECT MATCH | Values: `Lab`, `PS`, `MP`. |
| `Kode unik sampel` | `sampleCode` | DIRECT MATCH | Unique physical specimen barcode/serial (`SN-...`). |
| `Pola Penggunaan` | `usagePattern` | DIRECT MATCH | Values: `Sekali Pakai`, `Berulang`. |
| `Jenis Device` | `deviceType` | DIRECT MATCH | Values: `Aerosol`, `Non-Aerosol`. Controls dynamic Step 2 visibility. |
| `Tinggi Botol (mm)` | `bottleHeightMm` | DIRECT MATCH | Container height in millimeters. **Not centimeters, not Jarak Target**. |
| `Luas Aktuator (mm2)` | `actuatorAreaMm2` | DIRECT MATCH | Actuator contact area in mm². |
| `Setting Tinggi Tekan / Stroke (mm)` | `strokeDepthSetpointMm` | DIRECT MATCH | Mechanical actuator stroke travel setpoint. |
| `Kebocoran (Dropdown)` | `leakage` | DIRECT MATCH | Values: `Ya`, `Tidak`. Binary dropdown. |
| `Kedalaman Stroke Aktual (s)` | `actualStrokeDepth` | CONFLICT (ANOMALY)| HTML specifies `(s)` for stroke depth. Must be confirmed with client if unit is $mm$. |
| `Sudut Kontak (deg)` | `contactAngleDeg` | AMBIGUITY | Plume angle vs wetting angle; preserved verbatim pending client clarification. |
| `Diameter Sebaran (cm)` | `spreadDiameterCm` | AMBIGUITY | Side plume spread vs Front pattern diameter; preserved verbatim pending clarification. |

---

## 9. Mathematical Verification of Derived Calculations

The three summary metrics computed in Step 05 must be implemented as pure, side-effect-free TypeScript functions:

### 1. Discharged Mass ($\Delta m$)
$$\Delta m = m_{\text{awal}} - m_{\text{akhir}}$$
- **Preconditions**:
  - Both $m_{\text{awal}}$ and $m_{\text{akhir}}$ must be positive numbers.
  - If $m_{\text{awal}} < m_{\text{akhir}}$, the calculation yields a negative number (physically invalid mass gain), which indicates scale tare drift or operator error. The system must issue a validation warning.
- **Precision**: 3 decimal places ($0.000\text{ g}$).

### 2. Discharge Rate ($R$)
$$R = \frac{\Delta m}{t_{\text{aktual}}}$$
- **Preconditions**:
  - $t_{\text{aktual}} > 0$. If $t_{\text{aktual}} \le 0$ or undefined, return $0.000\text{ g/s}$ to avoid division by zero.
  - $\Delta m \ge 0$.
- **Precision**: 3 decimal places ($0.000\text{ g/s}$).

### 3. Pressure Drop ($\Delta P$) — Aerosol Only
$$\Delta P = P_{\text{awal}} - P_{\text{akhir}}$$
- **Preconditions**:
  - Valid only if `deviceType === 'Aerosol'`.
  - For Non-Aerosol devices, returns `null` or omitted.
  - $P_{\text{awal}} \ge 0$ and $P_{\text{akhir}} \ge 0$.
- **Precision**: 2 decimal places ($0.00\text{ bar}$).

---

## 10. Prioritized Client Questions for Paragon

The following 5 questions represent the true blockers that require client clarification:

1. **Stroke Depth Unit Confirmation**:
   - In Step 04, the label is `Kedalaman Stroke Aktual (s)`. Can Paragon confirm that this is a typographical error in the prototype and should be measured in millimeters ($mm$)?
2. **`Sudut Kontak` vs `Sudut Semprot`**:
   - In Step 04, the label is `Sudut Kontak (deg)`. Does this refer to the **Plume Spray Angle** (*Sudut Semprot*) measured by the camera, or the liquid droplet **Wetting Contact Angle** on a flat surface?
3. **`Diameter Sebaran` Plane**:
   - Does `Diameter Sebaran (cm)` refer to the vertical plume expansion thickness seen by the **Side Camera** or the circular impaction pattern diameter seen by the **Front Camera**?
4. **Acquisition Mode for "Auto" Fields**:
   - `Bobot Awal/Akhir Bruto`, `Durasi Tekan Aktual`, and `Ukuran Droplet D50` are marked as `Auto`. Are physical analytical balances, linear encoders, and droplet sizing instruments already connected to the PC via serial/USB, or will operators enter these values manually during Phase 1?
5. **Replication Semantics**:
   - When an operator clicks `Add Replication`, does this represent a repeated actuation cycle on the **same bottle** (`Sample` &rarr; multiple `TestRun`), or the introduction of a **new physical bottle** from the same batch (`KodePengujian` &rarr; multiple `Sample`)?

---

## 11. Proposed Implementation Backlog & Safety Analysis

### Pack A Readiness Assessment
- **Can Pack A safely start?** **YES, WITH A STRICTLY BOUNDED SUBSET.**
- We can safely implement the completely unambiguous domain calculations and metadata contracts that do **not** depend on client clarification.

### Exact Safe Subset of Pack A (Independent of Client Clarification)
The following tasks in Pack A can proceed immediately because their contracts and mathematics are 100% frozen:
1. **Pure Calculation Engine**:
   - Create pure domain functions in `packages/domain/src/calculations/sprayMetrics.ts`:
     - `calculateDischargedMass(initialWeight, finalWeight)`
     - `calculateDischargeRate(dischargedMass, actualDuration)`
     - `calculatePressureDrop(initialPressure, finalPressure, isAerosol)`
   - Create comprehensive unit tests in `packages/domain/test/sprayMetrics.test.ts` testing zero duration, negative weight checks, precision formatting, and aerosol guards.
2. **Unambiguous Schema Additions**:
   - Add optional study metadata fields to `KodePengujian` domain types and Zod contracts:
     - `productName`, `formulaNumber`, `lotNumberCandidate`, `kuf`, `trialObjective`, `benchmark`, `trialType` (`Lab` | `PS` | `MP`).
     - `storagePosition` (`Tegak` | `Tidur`).
     - `storageCondition` (`Ruang` | `Jemur` | `Display` | `Oven 40` | `Oven 45` | `Oven 50` | `Oven 60` | `Freezer` | `Siklus`).
     - `observationObjectives` array of 5 named strings.
3. **Packaging BOM Types on Sample**:
   - Add `deviceType` (`Aerosol` | `Non-Aerosol`) and `usagePattern` (`Sekali Pakai` | `Berulang`) to `Sample` domain types.
   - Add `AerosolPackagingSpec` and `NonAerosolPackagingSpec` schemas.
4. **Setpoints Snapshot Schema with Corrected Units**:
   - Add `setpointsSnapshotSchema` to `TestRun` using `bottleHeightMm: z.number().positive()` (STRICTLY mm, preserving `Tinggi Botol`).

### Tasks Held / Blocked Until Paragon Clarification
- Do **not** finalize `actualStrokeDepth` unit in Zod contract (leave flexible as numeric value without strict unit assertion until Paragon confirms $mm$).
- Do **not** hardcode droplet D50 acquisition logic.
- Do **not** modify or restrict `Sudut Kontak` naming until Paragon clarifies cone angle vs surface wetting angle.

---
*Report revised for Paragon Technology and Innovation — Spraybot R&D Team.*
