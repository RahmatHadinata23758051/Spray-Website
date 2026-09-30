# SKILLS — OpenCode Capability Plan

OpenCode can discover project/global `SKILL.md` files and load them on demand.

Do not blindly install dozens of skills. Use a small capability set that directly protects quality.

## 1. Required capability categories

### A. Frontend visual craft

Purpose:
- intentional visual direction,
- typography,
- spacing,
- layout,
- no generic AI dashboard aesthetic.

Look for skills named similar to:
- `frontend-design`
- `designing-frontend-interfaces`
- `frontend-ui-engineering`

At least one strong frontend-design skill should be active.

---

### B. UX / interaction states

Purpose:
- end-to-end task flow,
- loading/empty/error/partial states,
- forms,
- destructive actions,
- microcopy.

Look for:
- `designing-user-experience`
- `ux-design`
- equivalent.

---

### C. Accessibility

Purpose:
- WCAG 2.2 AA,
- keyboard,
- focus,
- semantic structure,
- contrast,
- accessible charts.

Look for:
- `building-accessible-interfaces`
- `accessibility`
- equivalent.

---

### D. Interface review / anti-slop audit

Purpose:
- inspect rendered screens,
- compare against `DESIGN.md`,
- identify AI-slop patterns,
- verify visual hierarchy.

Look for:
- `reviewing-interface-quality`
- `web-design-reviewer`
- `frontend-design-review`

This must be used after major UI screens are implemented.

---

### E. Frontend architecture

Purpose:
- keep layers clean,
- avoid page-level spaghetti state,
- stable repository/data-provider boundaries.

Look for:
- `frontend-architecture`
- equivalent.

---

### F. Testing

Purpose:
- unit/component/E2E checks.

Look for:
- `testing-patterns`
- `webapp-testing`
- `playwright`
- equivalent.

---

### G. Database/auth review

Use only when auth/database work starts.

Look for:
- `database-design`
- `security-review`
- `authentication-security`
- equivalent.

---

## 2. OpenCode skill locations

OpenCode supports project-local skills under locations such as:

```text
.opencode/skills/<skill-name>/SKILL.md
.claude/skills/<skill-name>/SKILL.md
.agents/skills/<skill-name>/SKILL.md
```

Prefer project-local skills when the behavior is specific to this repository.

---

## 3. Skill selection rules

The coding agent should:

1. inspect currently available skills,
2. load the smallest relevant set,
3. prefer reputable/upstream skills,
4. read each skill before applying it,
5. not let a generic skill override `PRD.md`, `DESIGN.md`, or `AGENTS.md`,
6. run an interface-quality review after each main page group.

Project rules win over generic skill advice.

---

## 4. Suggested public references

Useful sources to inspect when needed:

- OpenCode Agent Skills documentation
- Anthropic/Claude frontend-design skill
- Addy Osmani frontend UI engineering skills
- Impeccable anti-slop catalog
- Carbon Design System dashboard/spacing/typography guidance
- Atlassian design foundations

See `REFERENCES.md`.
