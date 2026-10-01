# DESIGN — Spraybot UI System

## 1. Design direction

### Product character

Spraybot is an **industrial R&D analysis tool**.

The interface should feel:

- clinical but not sterile,
- technical but not "developer themed",
- precise,
- quiet,
- clean,
- trustworthy,
- dense where needed,
- visually disciplined.

### Working aesthetic

**Technical Editorial / Industrial Instrumentation**

This means:

- structured grids,
- strong alignment,
- restrained blue accent,
- clear data typography,
- subtle technical line work where it has a real function,
- no decorative sci-fi effects,
- no marketing-SaaS styling.

This is not a landing page.

---

## 2. Anti-AI-slop contract

The project must actively avoid the common patterns documented by Impeccable and modern frontend-design review guides.

### Forbidden by default

Do not use:

- purple/blue gradients,
- gradient text,
- glassmorphism,
- glow borders,
- blurred decorative blobs,
- radial halo backgrounds,
- "cardocalypse" / nested cards for every group,
- huge rounded cards,
- `rounded-2xl` everywhere,
- icon tiles stacked above headings,
- tiny uppercase eyebrow labels above every title,
- giant marketing-style page headings,
- generic hero sections,
- decorative grid backgrounds,
- random floating badges,
- repeated 3-column feature-card patterns,
- soft shadow on every surface,
- fake testimonial/marketing copy,
- bouncy button animation,
- fade-in-on-scroll everywhere,
- status represented only by color.

### Card rule

A bordered panel is allowed only if it represents a real boundary:

- a tool,
- a metric cluster,
- a camera viewport,
- a report section,
- a dialog.

Do not wrap a section in a card simply because there is empty space.

### Radius rule

Working radius scale:

- `2px` — very small indicators
- `4px` — controls
- `6px` — panels
- `8px` — modal / popover when needed

No 16/24/32px default blobs.

### Shadow rule

Default surfaces use borders and layer contrast.

Shadows are reserved for:
- popovers,
- menus,
- dialogs,
- temporary floating surfaces.

---

## 3. Brand/color direction

No official Paragon brand manual has been supplied in this project package.

Therefore the following is a **working palette**, not an official brand claim.

### Core palette

| Token | Value | Use |
|---|---:|---|
| `--bg-canvas` | `#F5F8FC` | app background |
| `--bg-surface` | `#FFFFFF` | primary surface |
| `--bg-subtle` | `#EDF3F9` | secondary areas |
| `--text-primary` | `#10243E` | main text |
| `--text-secondary` | `#52657A` | secondary text |
| `--text-muted` | `#728196` | tertiary labels |
| `--border-default` | `#D5DEE8` | dividers/borders |
| `--border-strong` | `#AEBCCC` | strong boundaries |
| `--primary` | `#075AA8` | primary action / selected state |
| `--primary-hover` | `#064A8A` | hover |
| `--primary-soft` | `#E6F0FA` | selected rows / soft state |

### Semantic palette

| Token | Value |
|---|---:|
| `--success` | `#207A50` |
| `--warning` | `#9A6400` |
| `--danger` | `#B42318` |
| `--info` | `#2A65A8` |

Use semantic colors only for semantic meaning.

### Camera identity

Use a restrained camera color system:

- Side Camera: primary blue
- Front Camera: deep teal

These colors are for:
- overlay lines,
- active camera tabs,
- legends when needed.

Do not flood whole surfaces with them.

---

## 4. Typography

### Working font choice

Primary:
- **IBM Plex Sans**

Technical numeric/ID use only:
- **IBM Plex Mono**

Reason:
- highly legible,
- strong technical/R&D character,
- good numeric forms,
- less generic than default Inter/Geist-based product UI.

If Paragon provides an official typeface, replace this system intentionally.

### Type scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Page title | 28px | 600 | 36px |
| Section title | 20px | 600 | 28px |
| Subsection | 16px | 600 | 24px |
| Body | 16px | 400 | 24px |
| Compact UI body | 14px | 400 | 20px |
| Table header | 14px | 600 | 20px |
| Label | 12px | 500 | 16px |
| Metric value | 28-32px | 500/600 | 36px |
| ID/timestamp | 12-14px | 400 mono | 18px |

Rules:

- sentence case by default,
- no long all-caps text,
- no excessive letter spacing,
- use tabular numerals for measurements,
- align value + unit deliberately,
- never make helper text unreadably small.

---

## 5. Spacing

Use a fixed spacing scale.

`4, 8, 12, 16, 24, 32, 40, 48, 64`

Preferred:
- 8px micro gap
- 12px compact control gap
- 16px component padding
- 24px section gap
- 32px major group gap

Do not invent random values such as `13px`, `19px`, or `37px` unless a specific visual correction is documented.

The application can be dense, but density must be controlled.

---

## 6. Layout system

### Desktop target

Primary target:
- 1366×768
- 1440×900
- 1920×1080

### Shell

Recommended:

- compact left navigation,
- top contextual bar,
- main working canvas,
- optional right inspector only on analysis pages.

Avoid permanent four-column dashboards.

### Reading order

Important:
1. status / current task,
2. primary action,
3. current data,
4. supporting history/context.

Do not give equal visual weight to everything.

---

## 7. Component language

### Buttons

Primary button:
- solid blue,
- short label,
- used once per immediate task group.

Secondary:
- neutral border.

Danger:
- red only for destructive action.

No gradient buttons.

### Inputs

- compact,
- visible label,
- units attached clearly,
- helper text only when needed.

### Tables

Tables are the primary pattern for:
- test history,
- users,
- product presets.

Use:
- clear column hierarchy,
- 40-44px comfortable rows,
- selected row tint,
- sticky header where useful.

### Tabs

Tabs are appropriate for:
- Side / Front camera views,
- Original / Mask / Overlay.

Do not turn each tab into a pill unless there is a reason.

### Status

Use:
- dot/icon + text,
- not color alone.

Examples:
- Simulation mode
- Mock data loaded
- Analysis complete
- Retest required

---

## 8. Dashboard design

The dashboard must not be a card grid.

Preferred structure:

1. narrow system status strip,
2. current/recent test summary,
3. one primary analysis/telemetry section,
4. recent tests table,
5. one secondary summary region.

Limit high-emphasis KPIs.

---

## 9. Analysis Workspace design

This is the signature screen.

### Desktop composition

Recommended structure:

- top: test metadata + mode + status,
- left/center: large image/video analysis viewport,
- right: metric inspector,
- bottom: timeline + stable-window scrubber.

### Viewport modes

- Original
- Mask
- Overlay

### Side Camera overlay

Show:
- nozzle origin,
- calibrated axis,
- spray boundary,
- angle rays,
- centerline,
- length marker,
- vertical spread marker.

### Front Camera overlay

Show:
- detected contour,
- equivalent circle,
- centroid,
- horizontal/vertical axes.

### Measurement presentation

Prefer:

`72.4 cm`

over:

`SPRAY LENGTH: 72.400000 CM`

Show precision appropriate to the measurement.

---

## 10. Motion

Motion must communicate state.

Allowed:
- 120-180ms hover/focus transitions,
- panel state transition,
- timeline scrub,
- loading progress,
- analysis overlay toggle.

Avoid:
- bounce,
- springy navigation,
- decorative page entrance animation,
- constant pulsing/glowing.

---

## 11. Accessibility

Target WCAG 2.2 AA.

Must include:

- visible keyboard focus,
- semantic headings,
- logical tab order,
- sufficient contrast,
- form error text,
- icon labels or accessible names,
- chart/metric text alternatives,
- no color-only meaning,
- reduced-motion support.

---

## 12. Content style

Use concise operational language.

Good:
- Start simulated test
- Stable window
- Spray length
- Retest required
- Mock capture loaded

Avoid:
- Unleash insights
- Intelligent analysis
- Next-generation experience
- Powered by AI
- Revolutionize your testing

Do not describe the system as AI unless the actual feature uses a validated ML model.

---

## 13. Design QA checklist

Before a screen is considered finished:

- Is its purpose obvious in 5 seconds?
- Is there one clear primary action?
- Are cards used only for real grouping?
- Is spacing from the defined scale?
- Are radius values from the defined scale?
- Is blue used deliberately, not everywhere?
- Are typography levels visibly different?
- Does the UI still work with realistic long labels?
- Are empty/loading/error states present?
- Is Simulation Mode visible where required?
- Does the screen avoid every forbidden AI-slop pattern above?
