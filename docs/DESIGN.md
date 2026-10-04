# Spraybot Design System & UI/UX Specification

> **Canonical design source of truth for the Spraybot web application.**  
> This document supersedes older visual guidance when there is a conflict.  
> Product/workflow rules remain defined by the canonical project/domain documents.

---

## 1. Product Positioning

Spraybot is an **Industrial R&D Spray Analysis Workstation**.

It is not a CRM, marketing dashboard, generic admin template, or consumer app.

The interface supports an operational workflow:

**Batch → Setup → Capture → Analysis → Result**

The product combines three interface characteristics:

1. **Operational enterprise software** for Batch, Product, Report, User, and configuration management.
2. **Industrial acquisition software** for Capture.
3. **Technical measurement / machine-vision workstation software** for Analysis.

The visual system must communicate:
- precision
- trust
- engineering discipline
- operational clarity
- calmness
- traceability
- technical depth

The interface must not feel decorative, trendy, playful, or AI-generated.

---

## 2. Design Direction

### 2.1 Reference Blend

Use the following references as directional inspiration only:

- **Dub** — information architecture, tables, forms, restrained enterprise UI.
- **Lottielab** — typography discipline, spacing rhythm, quiet surfaces.
- **Linear / Raycast** — dense technical workbench ideas for Analysis only.

Do not copy any reference 1:1.

### 2.2 High-Level Visual Split

The application should be approximately:

- **80% light operational workspace**
- **20% dark technical workspace**

Light areas:
- Login
- Dashboard
- Batches
- New Batch
- Batch Detail
- Capture shell
- Result
- Reports
- Products
- Calibration
- Users
- Settings

Dark technical area:
- Analysis viewport/workbench
- image inspection canvas
- overlays
- capture timeline inside Analysis

The application shell remains light even when Analysis contains a dark workbench.

---

## 3. Non-Negotiable Design Principles

### 3.1 No AI Slop

Do not:
- turn every section into a floating card
- use glassmorphism
- use decorative gradients
- use glow effects
- use oversized marketing typography
- use huge empty whitespace without purpose
- add random KPI cards
- add decorative charts unsupported by operational data
- add colored pills for every value
- use multiple accent colors without semantic meaning
- use excessive corner rounding
- copy generic SaaS dashboard compositions

### 3.2 Information Before Decoration

Every visual element must help answer one of these questions:
- Where am I?
- Which Batch am I working on?
- What state is the Batch in?
- What information matters right now?
- What is the next valid action?
- What data is final vs editable?
- What is simulation vs real system state?

### 3.3 Dense but Calm

Spraybot is primarily used on a workstation.

Information density is allowed and encouraged when structured.

Avoid both extremes:
- cramped industrial legacy UI
- oversized consumer SaaS UI

### 3.4 One Visual Language

All pages must share:
- typography
- spacing
- icon size
- border tone
- radius scale
- status semantics
- button hierarchy
- field styling

Analysis may use a dark workbench but still follows the same system.

---

# 4. Typography

## 4.1 Primary Typeface

**Plus Jakarta Sans**

Use for:
- navigation
- page titles
- forms
- tables
- buttons
- labels
- helper text
- status text
- body copy

Avoid mixing unrelated sans-serif fonts.

## 4.2 Monospace Typeface

**IBM Plex Mono**

Use only for:
- Batch IDs
- Sample IDs
- Capture IDs
- timestamps inside technical contexts
- pixel coordinates
- calibration values
- measurement readouts where fixed-width alignment matters
- technical metadata

Do not use monospace for:
- page headings
- normal descriptions
- navigation
- form labels
- button labels

## 4.3 Type Scale

| Token | Size | Weight | Use |
|---|---:|---:|---|
| Display / Page title | 36px | 700 | Dashboard, Batches, Analysis, Result |
| Section title | 20px | 650–700 | major content section |
| Panel title | 16px | 650 | panel/table/workbench headings |
| Body | 14px | 400–500 | default application text |
| Label | 13px | 600 | form/table labels |
| Small | 12px | 450–550 | helper text, metadata |
| Technical | 12–13px | 500 | mono values |
| Micro | 11px | 600 | compact technical state only |

Line height:
- headings: 1.15–1.25
- body: 1.45–1.55
- technical rows: 1.3–1.4

Never create hierarchy using many unrelated font sizes.

---

# 5. Color System

## 5.1 Light Application Colors

```text
Canvas                #F3F7FB
Surface               #FFFFFF
Surface Subtle        #F8FAFC
Surface Active        #EAF4FF

Text Primary          #102A43
Text Secondary        #5F728A
Text Muted            #8493A7

Border                #DCE6F1
Border Strong         #C8D5E3

Primary Blue          #1D8FFF
Primary Blue Hover    #1677E6
Primary Blue Soft     #EAF4FF
```

## 5.2 Technical Workbench Colors

```text
Workbench              #0B1724
Workbench Raised       #101F2F
Workbench Border       #203247
Workbench Grid         #294054
Workbench Text         #E9F1F8
Workbench Muted        #91A7BA
```

Do not use pure black.

## 5.3 Semantic Colors

```text
Success        #14966B
Success Soft   #EAF8F2

Warning        #C98200
Warning Soft   #FFF6E3

Danger         #D64545
Danger Soft    #FDEEEE

Info           #1D8FFF
Info Soft      #EAF4FF
```

Semantic colors must have meaning.

Do not use green merely because an item is active.
Do not use orange merely for decoration.

## 5.4 Analysis Overlay Colors

These colors have stable meaning:

```text
AUTO / algorithm geometry         Blue   #1D8FFF
WORKING correction / calibration  Orange #F59E0B
ACCEPTED / applied final geometry Yellow #FACC15
Front reference geometry          Teal   #13A4A0 where required
```

Do not change these meanings between modes.

---

# 6. Spacing

Use a restrained 4px base system.

```text
4   micro
8   tight
12  compact
16  default
20  medium
24  section
32  large
40  page-level
48  major separation
```

Rules:
- standard control gap: 8–12px
- form field vertical gap: 16px
- panel internal padding: 20–24px
- major section gap: 24–32px
- page horizontal padding: 28–36px desktop
- avoid arbitrary values unless required by the viewport

---

# 7. Radius, Borders, and Shadows

## 7.1 Radius

```text
Sidebar shell       24px
Large panel         14px
Normal panel        12px
Input / button      9–10px
Pill / badge        999px only when semantically appropriate
Technical viewport  10–12px
```

Do not apply 20px+ radius to every component.

## 7.2 Borders

Most surfaces should use:
- 1px solid `Border`
- strong divider only when hierarchy requires it

Prefer borders over shadows.

## 7.3 Shadows

Use shadows sparingly.

Allowed:
- floating sidebar
- modal/dialog
- temporary popover/menu

Normal content panels should rely primarily on border + surface contrast.

No large blurry SaaS shadows.

---

# 8. Iconography

Use one icon family consistently.

Recommended visual character:
- thin/medium stroke
- simple geometric shapes
- 16–20px standard size
- 20–24px for section markers

Do not mix filled, outlined, and cartoon icon families.

Icons support labels; they do not replace important labels.

---

# 9. Global Application Shell

## 9.1 Desktop First

Primary target:
- 1440px–1920px workstation
- usable at 1280px laptop width

Mobile is not the primary operational target.

Do not destroy desktop density to optimize for phone layouts.

## 9.2 Sidebar

The left sidebar remains a defining element of Spraybot.

Target:
- width: approximately 244–260px
- margin from viewport: 14–16px
- height: `calc(100vh - 28–32px)`
- white surface
- 24px outer radius
- subtle border
- subtle shell shadow
- fixed/sticky

### Sidebar Structure

```text
┌──────────────────────────┐
│        TIME PANEL        │
│        19.27.05          │
│   KAMIS, 1 OKT 2026      │
├──────────────────────────┤
│  Spraybot                │
│  R&D Spray Analysis      │
├──────────────────────────┤
│  OPERATIONAL             │
│  Dashboard               │
│  Batches                 │
│                          │
│  WORKFLOW                │
│  Reports                 │
│                          │
│  CONFIGURATION           │
│  Products                │
│  Calibration             │
│                          │
│  SYSTEM                  │
│  Users                   │
│                          │
│  flexible spacer         │
│                          │
├──────────────────────────┤
│ Nadia Putri              │
│ Operator                 │
│ Settings                 │
│ Logout                   │
└──────────────────────────┘
```

### Time Panel

The clock is functional workstation context, not decoration.

Rules:
- dedicated inset block at top
- centered
- `HH.MM.SS`
- approximately 26–30px, weight 700
- use tabular numerals
- date below at 11–12px
- date uppercase or small caps is allowed
- do not use a different display font
- no gradient
- no oversized analog clock
- no glowing animation

Example:

```text
19.27.05
KAMIS, 1 OKT 2026
```

### Navigation

Section labels:
- 11–12px
- uppercase
- muted
- moderate tracking

Active item:
- primary blue background
- white icon + label
- 9–10px radius
- no glow
- no oversized pill

Hover:
- `Primary Blue Soft`
- primary text/icon

---

# 10. Page Header

Every canonical page should have a consistent header structure.

```text
Breadcrumb
Page Title        Optional one-line description                 Context Status
                                                                  Primary Action
```

Avoid repeated page titles such as:

```text
Batches
Batches
```

One strong page title is enough.

Descriptions should be short and operational.

Simulation state belongs in the upper context area and must be clear but not visually dominant.

---

# 11. Status System

Use status badges only for actual lifecycle/status values.

Batch examples:
- DRAFT
- READY
- CAPTURING
- PROCESSING
- REVIEW REQUIRED
- FINALIZED
- FAILED
- ABORTED

Badge anatomy:
- small dot
- text
- low-saturation background
- semantic color

Do not turn ordinary metadata into badges.

---

# 12. Buttons

## Primary

Use for exactly one dominant action per context.

Examples:
- New Batch
- Prepare Batch
- Start Capture
- Confirm Final Analysis

Style:
- primary blue
- white label
- 40–44px height
- 9–10px radius

## Secondary

White or subtle background with border.

Examples:
- Cancel
- Adjust Calibration
- View Details

## Tertiary

Text-only / quiet button.

Examples:
- Back to Batches
- Open Result
- table row actions

## Destructive

Only for destructive operations.
Never reuse red for ordinary workflow actions.

---

# 13. Forms

Forms must feel like controlled engineering setup, not generic CRUD.

Rules:
- label above input
- helper text only when useful
- 40–44px control height
- consistent widths
- logical field grouping
- required indicator only where needed
- units visible
- numeric fields align values clearly
- read-only fields look read-only, not disabled/broken

Long pages should be divided by meaningful sections, not card after card.

---

# 14. Tables

Tables are first-class components.

Use for:
- Batches
- Reports
- Products
- Users

Rules:
- compact row density
- 44–52px rows
- subtle header surface
- clear column alignment
- numeric/technical values may use mono
- row hover
- no zebra stripes unless testing proves necessary
- actions on right
- search/filter above the table
- avoid wrapping IDs unnecessarily

The table itself should be the focus, not a giant card surrounding a tiny table.

---

# 15. Page Specifications

## 15.1 Login

Goal:
- controlled workstation access
- minimal visual noise

Structure:
- centered authentication panel
- Spraybot identity
- explicit Simulation Mode/local workstation state
- short description
- email/password
- primary Sign In action

Background may include extremely subtle abstract geometry, but never decorative gradients or marketing art.

No giant logo.
No promotional copy.

## 15.2 Dashboard

Purpose:
- operational overview
- not a KPI marketing dashboard

Recommended hierarchy:
1. page title + New Batch
2. simulation/system context strip
3. Current / Latest Batch
4. Awaiting Review
5. Recent Finalized Batches

Do not add fake metrics like:
- productivity percentage
- accuracy score
- monthly growth
- efficiency index

unless supported by real domain data.

Avoid excessive metric cards.

## 15.3 Batches

Batches is the operational repository/history.

Primary element:
- table

Header toolbar:
- count
- search
- filter
- New Batch

Status must be visible at scan speed.

Actions:
- Open Batch
- View Result / report where relevant

Do not create separate historical page.

## 15.4 New Batch

Treat as a structured setup screen.

Recommended sections:
1. Product Identity
2. Requested Test Parameters
3. Notes
4. Simulation Settings

Do not show a giant empty canvas.

Parameter summary should be compact and structured.

Bottom action area should be visually clear:
- Cancel
- Create Batch Draft

## 15.5 Batch Detail

Purpose:
- contextual hub for one Batch
- clarify current lifecycle and next step

Header:
- Batch ID
- lifecycle status
- one primary lifecycle action

Main:
- setup / frozen setup
- Product / Recipe / Lot / Sample ID / Notes

Secondary:
- context summary
- operator
- created/prepared/finalized metadata

Do not create multiple equal-weight cards competing with the workflow action.

---

# 16. Capture Workspace

Capture is an acquisition workspace, not a dashboard.

## 16.1 Page Structure

```text
Page Header
Batch Context Strip
┌───────────────────────┬───────────────────────┐
│ Side Camera           │ Front Camera          │
│                       │                       │
│ viewport              │ viewport              │
│                       │                       │
└───────────────────────┴───────────────────────┘
Capture Timeline
Acquisition State / Primary Action
```

## 16.2 Camera Panels

Side + Front only.

Each camera panel:
- consistent height
- camera name
- minimal utility controls
- viewport
- restrained metadata

Do not treat the camera as a tiny chart inside a generic card.

The viewport should dominate.

## 16.3 Capture Timeline

The timeline is operational.

Show:
- capture progress
- current moment
- phase if available
- completed moments
- acquisition state

Avoid decorative segmented blocks with no readable meaning.

## 16.4 Simulation

Always make simulation explicit.

Correct:
- `Simulation Mode`
- `Fixture capture ready`

Incorrect:
- `Camera connected`
- `Hardware ready`
- `Machine online`

unless backed by real hardware state.

---

# 17. Analysis Workspace — Highest Priority

**Analysis is the most important redesign area.**

The current implementation is functionally capable but visually collides:
- viewport, timeline, inspector, selection, calibration, and finalization compete for attention
- the inspector is too narrow and fragmented
- too many boxed sections stack vertically
- important actions are mixed with metadata
- the viewport lacks a strong workstation composition
- analysis context is compressed into small labels
- the page feels like a normal dashboard with a dark rectangle instead of a deliberate engineering workbench

The redesign must fix this intentionally.

## 17.1 Analysis Layout

Recommended desktop composition:

```text
Breadcrumb + Analysis Title                           Simulation Mode

┌──────────────────────────────────────────────────────────────────────┐
│ ANALYSIS CONTEXT BAR                                                 │
│ Stable phase | Recommended | Batch | Capture | Time | Sync          │
└──────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────┬──────────────────────┐
│ TECHNICAL WORKBENCH                           │ INSPECTOR             │
│                                               │                      │
│ ┌───────────────────────────────────────────┐ │ Measurement          │
│ │ Side Profile / Front Pattern              │ │                      │
│ │                   Original Mask Overlay   │ │ Calibration          │
│ ├───────────────────────────────────────────┤ │                      │
│ │                                           │ │ Capture Moment       │
│ │              IMAGE VIEWPORT               │ │                      │
│ │                                           │ │ Report Selection     │
│ │                                           │ │                      │
│ ├───────────────────────────────────────────┤ │ ───────────────────  │
│ │ CAPTURE TIMELINE                          │ │ Final Analysis       │
│ └───────────────────────────────────────────┘ │                      │
└───────────────────────────────────────────────┴──────────────────────┘
```

### Core rule

The workbench and inspector are **two primary regions**, not a pile of cards.

## 17.2 Analysis Main Grid

Desktop:
- main content uses CSS grid
- left workbench: `minmax(0, 1fr)`
- right inspector: approximately `320–360px`
- gap: 12–16px
- inspector may be sticky within the viewport
- both areas align at the top

Do not reduce the inspector below approximately 300px on normal desktop widths.

At narrower laptop widths:
- inspector can move below the workbench
- do not squeeze it into an unreadable rail

## 17.3 Context Bar

The top Analysis context should be one compact strip.

Include:
- Phase
- Recommendation
- Batch ID
- Capture index
- Timestamp
- Sync status

Do not render every item as a colorful pill.

Recommended:
- Phase and Recommendation may use semantic badges
- Batch/Capture/Time/Sync use quiet label-value pairs
- use separators

The operator should understand current capture context in under 2 seconds.

## 17.4 Workbench Surface

The dark workbench is a purpose-built engineering surface.

Use:
- dark navy background
- subtle technical border
- no external heavy shadow

The workbench includes:
1. camera/view toolbar
2. image viewport
3. capture timeline

Do not leave a huge unused dark empty area.

The workbench height should derive from its content, not fill arbitrary viewport height.

## 17.5 Camera and Display Toolbar

Left:
- `Side Profile`
- `Front Pattern`

Use a compact segmented/tab control.

Right:
- Original
- Mask
- Overlay
- Fullscreen

Do not scatter these controls in separate cards.

Active camera tab:
- primary blue

Display mode:
- compact segmented control
- Overlay may be default where appropriate

## 17.6 Technical Viewport

The image is the main visual object.

Rules:
- maximize usable image area
- keep real aspect ratio
- center the image
- leave enough padding for measurement labels
- grid should be readable but subtle
- technical metadata may sit in a thin top-left readout
- avoid text floating randomly over image

When overlays are visible:
- automatic geometry = blue
- working edit = orange
- accepted final geometry = yellow

Use consistent line width and label style.

Measurement labels:
- IBM Plex Mono
- small dark-backed or transparent technical labels
- units always visible
- do not obscure important geometry

## 17.7 Correction Mode

When operator enters measurement correction:

Do not add another stack of cards.

Transform the workbench toolbar into an edit state.

Example:

```text
Editing Measurement     [Length] [Spread] [Angle]        Cancel   Apply
```

Only relevant handles appear.

### Side

Length:
- endpoint handle only

Spread:
- independent horizontal measurement slice
- top/bottom handles
- `spreadPositionPx` remains source of truth

Angle:
- upper/lower angular handles

### Front

- centroid handle
- equivalent diameter control/handle

Circularity and symmetry remain automatic-only unless domain changes.

## 17.8 Calibration Mode

Calibration is a dedicated workbench mode.

Toolbar:

```text
Calibration
Reference: 1000 mm
Cancel
Apply Calibration
```

Viewport:
- Anchor A
- Anchor B
- ruler body
- clear reference line
- scale preview

Inspector:
- Reference distance
- pixel distance
- mm/px
- status

Do not show unrelated measurement edit controls simultaneously.

## 17.9 Inspector Architecture

The right inspector should not be five visually equal cards.

Use one inspector shell with clear sections.

Recommended order:

### A. Measurements
Primary technical values.

Side:
- Spray Length
- Spray Angle
- Vertical Spread
- Direction Offset

Front:
- Spray Area
- Equivalent Diameter
- Circularity
- Centroid X/Y
- Horizontal Symmetry
- Vertical Symmetry

Value column:
- right aligned
- IBM Plex Mono
- unit included

One clear `Edit Measurement` action.

### B. Calibration
Compact read-only summary:
- Reference
- Anchor A
- Anchor B
- Scale
- Status

One `Adjust Calibration` action.

### C. Capture Moment
- Capture #
- Timestamp
- Phase
- Sync
- Recommendation

### D. Report Selection
- Selected `n / 10`
- Primary state
- Supporting state
- Set as Primary
- Add/Remove Supporting

Do not display long instruction paragraphs unless an error/requirement needs explanation.

### E. Final Analysis
This is separated from ordinary metadata.

Use:
- current readiness state
- concise blocking reason if invalid
- `Confirm Final Analysis` as the final primary action

This section may be visually anchored at the bottom of the inspector.

## 17.10 Analysis Timeline

The timeline belongs to the workbench.

Avoid 60 identical tiny blocks with no hierarchy.

Show phase grouping:

```text
PRE-SPRAY | BUILD-UP | STABLE | DECAY
```

Capture moments still exist individually, but phase background/grouping must make the sequence understandable.

Visual states:

```text
inactive          muted slate
available         blue-gray
stable            blue
recommended       amber marker
primary           strong blue/selected outline
supporting        secondary selected outline
current           position marker
```

The timeline should show:
- current capture number
- total captures
- current timestamp

Selection meaning must remain visible.

## 17.11 Analysis Action Priority

Never allow these to compete equally:
- Edit Measurement
- Adjust Calibration
- Set Primary
- Add Supporting
- Confirm Final Analysis

Hierarchy:
1. Current editing mode actions if editing
2. Capture selection
3. Finalization

Final confirmation is only visually dominant when the analysis is valid and ready.

---

# 18. Result

Result is a frozen engineering record.

It must feel clearly different from editable Analysis.

Tone:
- calm
- auditable
- final
- document-like
- technical

Recommended hierarchy:
1. Batch + finalized status
2. Primary capture
3. accepted measurements
4. auto vs final differences
5. calibration snapshot
6. supporting capture summary
7. traceability metadata
8. export/report actions

Do not reuse Analysis editing controls.

Do not use mutable-looking fields.

Final values should visually dominate automatic values when corrections exist.

---

# 19. Reports

Reports is a repository of finalized technical records.

Use:
- table-first layout
- search/filter
- finalized timestamps
- Batch/Product/operator
- export/open actions

Do not present Reports as another dashboard.

---

# 20. Products

Use an enterprise master-data pattern.

Primary:
- searchable table/list
- concise product metadata
- create/edit actions

Avoid oversized product cards.

---

# 21. Calibration

Global Calibration configuration is different from per-analysis calibration editing.

The page should clearly distinguish:
- system/reference calibration configuration
- historical per-Batch calibration snapshots

Do not imply hardware calibration is active when running simulation.

---

# 22. Users

Simple administrative table.

Show only meaningful identity/access information.

Avoid profile-card grids.

---

# 23. Settings

Group settings by actual concern.

Recommended:
- Application
- Simulation
- Appearance only if the feature exists
- Session/system where supported

Do not invent settings.

---

# 24. Empty States

Empty states should be compact and operational.

Good:

```text
No batches awaiting review.
Captured batches requiring operator review will appear here.
```

Bad:
- giant illustration
- inspirational text
- unnecessary CTA when no action exists

---

# 25. Loading States

Prefer:
- skeleton rows for tables
- restrained spinner for actions
- viewport placeholder for camera/image

Do not shift layout dramatically during loading.

---

# 26. Error States

Error states must explain:
1. what failed
2. whether data is safe
3. what action is available

Do not use generic:
`Something went wrong`

for known domain states.

---

# 27. Accessibility

Minimum:
- visible keyboard focus
- AA text contrast
- labels associated with inputs
- status not encoded by color alone
- buttons have textual names
- disabled state visually clear
- technical overlays must remain distinguishable without relying only on hue

Do not sacrifice technical density for accessibility; structure it correctly.

---

# 28. Responsive Strategy

## >= 1440px
Primary design target.

## 1280–1439px
Maintain sidebar and main composition.
Reduce page padding slightly.

## 1024–1279px
Allow:
- compact sidebar if necessary
- inspector below Analysis workbench instead of crushing width
- tables may horizontally scroll

## < 1024px
Support reading/basic operation where practical, but do not redesign Spraybot as a mobile-first product.

Critical Analysis editing is optimized for workstation screens.

---

# 29. Design Tokens — Recommended Initial Set

```text
font.sans             Plus Jakarta Sans
font.mono             IBM Plex Mono

color.canvas          #F3F7FB
color.surface         #FFFFFF
color.surface.subtle  #F8FAFC
color.primary         #1D8FFF
color.primary.hover   #1677E6
color.primary.soft    #EAF4FF

color.text.primary    #102A43
color.text.secondary  #5F728A
color.text.muted      #8493A7

color.border          #DCE6F1
color.border.strong   #C8D5E3

color.workbench       #0B1724
color.workbench.2     #101F2F
color.workbench.border #203247

radius.input          10px
radius.panel          12px
radius.panel.large    14px
radius.sidebar        24px

space.1               4px
space.2               8px
space.3               12px
space.4               16px
space.5               20px
space.6               24px
space.8               32px
space.10              40px
```

Do not create dozens of near-identical tokens.

---

# 30. Implementation Guardrails

During redesign:

Do not modify:
- Batch lifecycle
- repository semantics
- Analysis persistence behavior
- calibration mathematics
- measurement correction mathematics
- final report immutability
- route semantics
- Side/Front camera domain rules

Do not reintroduce:
- Rear Camera
- legacy Test workflow
- presentation → concrete data imports

Visual refactor must preserve:
- D1–D5 behavior
- all existing test guarantees
- hard-refresh persistence
- simulation truthfulness

---

# 31. Visual QA Checklist

Every redesigned page must be checked for:
- [ ] Plus Jakarta Sans is consistent
- [ ] Mono is used only for technical data
- [ ] Page title hierarchy is clear
- [ ] No duplicate page heading
- [ ] Primary action is obvious
- [ ] Status colors are semantic
- [ ] Borders/radius match tokens
- [ ] No unnecessary card nesting
- [ ] No random gradients
- [ ] No heavy shadows
- [ ] No unsupported KPI/charts
- [ ] Simulation Mode remains explicit
- [ ] Side + Front only
- [ ] Responsive at 1280px workstation width
- [ ] keyboard focus visible
- [ ] loading/empty/error states are deliberate

Analysis additionally:
- [ ] Workbench dominates, not the inspector
- [ ] Inspector width is readable
- [ ] Context bar is understandable at a glance
- [ ] Camera/display toolbar is unified
- [ ] Timeline has phase hierarchy
- [ ] Measurement / Calibration modes do not visually collide
- [ ] Selection controls are separate from editing controls
- [ ] Finalization is visually isolated
- [ ] Auto / working / accepted overlay colors retain canonical meaning
- [ ] No large unused dark area

---

# 32. Redesign Implementation Order

Recommended implementation sequence:

### R1 — Foundations
- typography
- color tokens
- spacing
- radius
- buttons
- form controls
- table primitives
- status badges

### R2 — Application Shell
- sidebar
- time/date panel
- navigation
- page header
- breadcrumbs
- simulation context

### R3 — Core Operational Pages
- Dashboard
- Batches
- New Batch
- Batch Detail

### R4 — Capture Workspace
- camera panels
- Batch context
- acquisition timeline
- capture controls

### R5 — Analysis Workbench
Highest priority and deepest redesign:
- layout composition
- context strip
- workbench
- viewport toolbar
- timeline
- inspector
- measurement mode
- calibration mode
- report selection
- finalization

### R6 — Result & Reports
- immutable Result presentation
- report repository
- CSV/export UI

### R7 — Supporting Pages
- Products
- Calibration
- Users
- Settings
- Login refinement

### R8 — Visual QA
- 1920px
- 1440px
- 1280px
- keyboard navigation
- empty/loading/error states
- visual consistency
- regression tests

Do not implement all redesign phases as one uncontrolled visual rewrite.

---

# 33. Final Design Intent

Spraybot should feel like a **real engineering product built for repeated daily use**, not a showcase dashboard.

The ideal impression is:

> “This is a focused industrial R&D workstation with modern software quality.”

Not:

> “This is a nice-looking admin template.”

The visual hierarchy must make the workflow self-evident, while Analysis must feel like a purpose-built technical instrument rather than a dashboard page with a camera image inside it.
