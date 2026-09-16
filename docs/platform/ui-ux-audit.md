# Captar Platform UI/UX Audit

Status: active audit specification
Scope: `apps/platform`
Goal: redesign Captar as a professional, dense, dark developer console without inventing unsupported product surfaces.

## 1. Product-design principles

The platform is an operational console, not a marketing dashboard. Every screen should optimize for fast scanning, investigation, and confident action.

### Mandatory questions for every page and component

For every visible element ask:

1. What is the primary user job on this route?
2. What must be understood within five seconds?
3. Does this element help that job, or is it decoration?
4. Is the information placed where users expect it?
5. Does it deserve a card, or can hierarchy/spacing provide enough separation?
6. Does a KPI deserve equal visual weight with operational data?
7. Is a chart more useful than a number/table for this datum?
8. Does an icon communicate meaning or only add noise?
9. Is the action primary, secondary, contextual, or destructive?
10. Can the user complete the common task without unnecessary navigation?
11. Does the UI distinguish authoritative, estimated, blocked, failed, running, and empty states correctly?
12. Is the displayed datum actually supported by Captar's current data model?
13. Does the layout still work at ~1280 px and at wide desktop sizes?
14. Are keyboard, focus, loading, empty, error, and permission states designed?
15. Can related pages reuse the same interaction model so the user does not relearn the product?

## 2. Visual system

### Direction

Use a restrained ChatGPT/Linear-style black application shell. Prefer hierarchy, typography, alignment, and subtle borders over gradients, glows, decorative grids, nested cards, or excessive color.

### Recommended tokens

- canvas: `#0d0d0d`
- sidebar: `#101010`
- surface: `#141414`
- elevated/hover: `#191919`
- border: approximately `#272727`
- primary text: approximately `#f4f4f5`
- secondary text: approximately `#a1a1aa`
- muted text: approximately `#71717a`
- success/active: restrained emerald/green
- warning/pending: amber
- destructive/blocked/failed: red/rose only where semantically correct
- informational: neutral by default; blue only when a second semantic accent is genuinely needed

Do not use ordinary card gradients or neon glows. Remove the decorative global grid background from operational pages.

### Typography

Adopt Geist Sans for product UI and Geist Mono for identifiers, payload/code, API/hook/trace IDs, and other machine-readable values.

Recommended scale:

| Role | Size / weight |
| --- | --- |
| Page title | 24px / 600 |
| Page description | 14px / 400, ~20px line-height |
| Section title | 16px / 600 |
| Card/region heading | 13-14px / 500-600 |
| KPI value | 28-32px / 600 only for true top-level KPIs |
| UI body | 14px / 400 |
| Dense table | 13px / 400-500 |
| Label / metadata | 12px / 500 or 400 |
| Mono identifiers | 12-13px |

Avoid 30-36px page headings in the console. Dense infrastructure software benefits from compact hierarchy.

### Spacing and sizing

- sidebar expanded: 240-248px
- compact sidebar target if implemented: ~56px
- top bar: 52-56px
- desktop page gutter: 24px
- section gap: 20-24px
- card/region gap: 12-16px
- ordinary surface radius: 10-12px
- button radius: ~8px
- input height: 36-40px
- dense table row: 44-48px target
- table cell vertical padding: ~10-12px
- default structural surface padding: 16-20px, not 24px everywhere

### Icons

The platform already centralizes Hugeicons. Keep that coherent icon dependency unless a concrete missing-icon problem requires change.

Rules:

- 16px: table rows, metadata, compact navigation
- 18px: normal navigation and controls
- 20px: major actions/status callouts
- 24px maximum for empty-state/supporting illustrations
- no icon next to every metric/title
- use an icon only when it improves recognition, status understanding, or action discoverability
- one icon style and stroke weight across the console

## 3. Global shell audit

### Current findings

The current shell has a fixed 256px sidebar, 64px header, decorative grid background, global operational-status label, a permanent `Runtime protection active` education card, and white-filled active navigation.

### Proposed shell

**Sidebar**

- 240-248px desktop width.
- Captar mark + product name at top.
- Project/workspace switcher immediately below the brand when a project context exists.
- Primary project navigation as one compact group: Overview, Traces, Guardrails, Datasets, Evals.
- Settings/account at the bottom.
- Remove the permanent runtime-protection education card; onboarding/help belongs in contextual empty states or Help.
- Active item should use a low-contrast selected surface plus accent indicator/text, not white fill with black text.
- Keep current project navigation stable across every project route.

**Header**

- 52-56px.
- Use for page-level context/actions, not a permanent generic `All systems operational` message unless the product has a real system-health data source and user action tied to it.
- Mobile navigation needs a real menu/sheet rather than a horizontally scrolling full nav as the long-term pattern.

**Content**

- Remove decorative grid background.
- Allow wide operational canvases up to ~1600px where trace tables/explorers benefit; do not center everything in a marketing-width column.

## 4. Navigation / information architecture

Current real project routes support:

- Overview
- Dashboard
- Traces
- Guardrails / Violations
- Datasets
- Evals
- Hook detail

### Recommendation

Merge the conceptual distinction between `Overview` and `Dashboard` unless there is a strong user job separating them. Today both are overview-like and duplicate summary information.

Recommended project nav:

1. Overview
2. Traces
3. Guardrails
4. Datasets
5. Evals

Hook/connections should be managed within Overview/Settings or a future Connections route if the surface becomes large enough. Do not add generated-concept routes such as Alerts, Integrations, Budgets, Tools, or a global Sessions page until real product routes/data warrant them.

## 5. `/projects` — project chooser

### Primary job

Find/open a project or create a new one.

### Current issues

- Large 2/3-column cards use too much space for a collection users primarily scan.
- Each project repeats decorative icon rows.
- `Authenticated observability ready` is vague and not actionable.
- Hook count appears twice (`hooks.length` and `_count.hooks`).
- Hover translate/lift makes the cards feel consumer-oriented rather than like a developer console.
- Search occupies a separate line even when project count is small.

### Proposed structure

Header:

- `Projects`
- concise one-line description only if needed
- right-aligned `New project` primary action
- search/filter control integrated immediately below or into the table toolbar

Main:

Use a compact list/table for 4+ projects. Suggested columns:

- Project
- Hooks / environments
- Sessions or recent activity
- Traces
- Last activity
- contextual menu

Only show spend/health if supported efficiently by the current query; do not add decorative fake KPIs.

For 1 project, reconsider automatic redirect because it hides project switching/creation. If retained, provide an obvious project switcher globally.

Empty state should include the single primary `Create project` action, not only explanatory copy.

## 6. `/projects/[projectId]` — project overview

### Primary job

Understand whether the project is connected and healthy, then reach its operational surfaces.

### Current issues

- The entire project header is inside a Card.
- Five equal KPI cards mix operational counts with inventory counts.
- `Policy scope` duplicates hook count conceptually.
- The hook table is the most operationally important content but starts below a large summary block.
- Datasets and Manual Evals cards duplicate navigation already present in the sidebar.
- `What this project manages` is documentation occupying permanent production space.
- Integration pattern/code tutorial is useful during onboarding but should not remain a dominant permanent card.
- Excessive nested cards reduce hierarchy.

### Proposed structure

Page header (not a card):

- project name + slug/environment context
- connection status summary
- primary `New hook` / connection action
- overflow menu for project-level actions

First operational region:

- Hook/connection table with name, environment, status, retention, effective policy version, recent activity/signals.
- This should dominate the page.

Compact summary strip, only when useful:

- traces (time-windowed if possible)
- sessions (time-windowed if possible)
- violations (time-windowed if possible)
- committed spend (time-windowed if possible)

Do not use dataset/eval inventory counts as top KPIs.

Onboarding code should appear only when there are no hooks/no traces, or behind a `Setup`/`View integration code` sheet.

## 7. `/projects/[projectId]/dashboard` — dashboard

### Primary job

Answer: what happened recently, what did it cost, and what needs attention?

### Current issues

- Page header sits inside a card and repeats sidebar navigation with four outline buttons.
- Traces/Datasets/Eval runs/Hooks are given equal KPI weight despite very different operational value.
- Reserved/Committed/Net spend are three cards for one accounting story.
- Provider/model breakdowns are useful, but the page lacks a time trend; counts have unclear time windows.
- `Recent traces` is useful and deserves more visual priority.

### Recommendation

Prefer merging this route into Overview. If it remains separate:

Header (not card): Dashboard + range control.

Top summary: at most 3-4 true runtime KPIs, all with explicit time windows:

- committed spend
- traces/requests
- block/failure rate or violations
- optionally latency only if real latency aggregation is available

Spend should be one coherent module:

- primary committed amount
- small reserve/release/estimated context
- provider/model breakdown in tabs or adjacent compact list

Recent traces table should sit high on the page.

Inventory counts (datasets/evals/hooks) belong in navigation/supporting context, not primary KPI cards.

## 8. `/projects/[projectId]/traces` — trace explorer

### Primary job

Find a suspicious or relevant trace quickly and open it.

### Current strengths

- URL-backed filters are shareable/bookmarkable.
- Provider/model/status facets are real and useful.
- Table contains useful runtime columns.
- Actual-vs-estimated cost distinction is present for running traces.

### Current issues

- Intro header is a full Card.
- Four KPI cards consume significant height before the table.
- Filters are isolated inside another Card with heading/description; this adds unnecessary vertical distance.
- `Back to dashboard` is redundant with persistent nav.
- Only latest 100 can be shown; truncation should evolve into actual pagination/virtualization.

### Proposed structure

Page header:

- `Traces`
- matching count + compact cost/block/failure summary inline

Toolbar immediately above table:

- search
- Provider
- Model
- Status
- date/time range when supported
- Reset only when active

Table:

- Trace ID
- Status
- Provider / model
- Hook/environment
- Tokens
- Cost + confidence/estimated marker
- Started / duration if available

Make whole row clickable while preserving copy/link actions. Use mono only for IDs, not entire cells.

Desktop enhancement: optional split-panel detail preview rather than always navigating away.

## 9. `/traces/[traceId]` — trace debugger

### Primary job

Understand exactly what happened in one execution, where time/spend occurred, and why it failed/blocked.

### Current strengths

- Span tree, timeline, raw events, violations, payloads, cost/tokens all exist.
- Running traces auto-refresh.
- Problem spans are derived rather than guessed.

### Current issues

The same underlying information is rendered several times:

- problem summary card
- Problems tab
- Violations tab
- Tree tab
- Span Summary side card
- Timeline tab
- separate Prompt Payload / Response Payload cards

This creates competing representations rather than one debugger.

### Proposed desktop layout

Header:

- trace ID + copy
- status
- provider/model/hook/session metadata
- compact totals (duration, tokens, committed cost, violation count)

Main explorer: `minmax(0, 1fr) 360-420px inspector`.

Left/center:

- execution tree/timeline as the primary representation
- each span row shows type/status, duration, cost/tokens when applicable
- blocked/failed spans visibly annotated in place
- selecting a span updates inspector

Right inspector:

- selected span details
- input/output/payload
- attributes
- violations/errors
- raw event JSON

Trace-level tabs should be minimal: Execution | Payload/Raw (or similar). Do not maintain separate Problem + Tree + Timeline + Events + Violations representations if one contextual explorer can surface them.

Dataset export is a contextual action, not a large permanent side card.

## 10. `/projects/[projectId]/violations` — guardrail explorer

### Primary job

Investigate what Captar blocked/flagged and determine affected traces/runtime context.

### Recommendation

Mirror the Trace Explorer interaction model exactly:

- page header without card
- compact inline summary rather than 4 KPI cards
- one toolbar directly above the table
- same select/search sizing and reset behavior
- row click opens trace/context

Useful columns:

- severity/outcome + category
- message/reason
- provider/model
- hook/environment
- trace
- timestamp

Avoid exposing raw event-type strings as the most prominent user-facing label when a normalized outcome/category is easier to scan. Preserve event type as metadata.

## 11. `/hooks/[hookId]` — connection / effective policy

### Primary job

Verify a runtime connection's identity/configuration, inspect effective policy, and see recent activity.

### Current issues

- Four KPI cards inside a large header card.
- Sessions, Traces, Policy, Violations are separate tabs even though users often need them together during debugging.
- Trace cards duplicate table/list patterns elsewhere.
- Policy is displayed as raw JSON only.
- Project link rendered as an outline button inside metadata.

### Proposed structure

Header:

- hook name
- status
- public ID + copy
- environment
- retention mode
- project breadcrumb
- contextual actions

Main split:

- Effective policy: structured sections for Budget, Call/Model, Tool, Retention; raw JSON available as secondary tab/action.
- Recent activity: compact traces/violations list with links.

Session count, trace count, violations, spend can be a compact summary row, not four floating cards.

Integration code belongs behind `Setup code` / `SDK config` action.

## 12. `/projects/[projectId]/datasets` — datasets

### Primary job

Find/open datasets and create/import when needed.

### Current issue

A permanent 380px dataset creation form consumes a large part of the page even though creation is occasional.

### Proposed structure

Header:

- Datasets
- count
- primary `New dataset`
- secondary Import if import can create/select a destination meaningfully

Main table:

- Name
- Description
- Rows
- Evals
- Updated
- source/activity if useful
- row menu

Creation should be modal/sheet. Empty state carries the create/import actions.

## 13. `/projects/[projectId]/datasets/[datasetId]` — dataset detail

### Primary job

Inspect/manage rows and send them into evaluation workflows.

### Current issues

- Created/Updated timestamps are presented as MetricCards.
- Three separate export buttons consume header space.
- Manual Eval Create and Dataset Import permanently consume a 380px left rail.
- Full PayloadCards inside table cells will produce extremely tall, difficult-to-scan rows.
- Metadata pre JSON is also rendered directly inside table cells.

### Proposed structure

Header:

- dataset name + row count
- description
- New Eval
- Import
- Export dropdown (JSON / JSONL / CSV)
- overflow for future destructive/edit actions

Rows table should remain dense:

- row number
- truncated input preview
- truncated output preview
- source
- retention
- metadata indicator

Selecting a row opens a side inspector with full Input, Output, Metadata, source trace link, retention provenance.

Manual evals using this dataset belong in a compact secondary tab or relation panel rather than cards above the row table.

## 14. `/projects/[projectId]/evals` — eval list

### Primary job

Find an evaluation workflow and understand its latest review state.

### Current strengths

The table is the correct base representation.

### Improvements

- Header should not be a Card.
- Eval and Dataset names should be normal clickable text/rows, not outline buttons inside table cells.
- Add status/latest-run state if available.
- Progress should be visually scan-friendly (`reviewed / total`, optional tiny progress bar) rather than requiring interpretation across separate columns.
- Keep pass rate but show `—` when no reviewed rows instead of implying a meaningful `0%` if the underlying metric semantics allow distinction.

## 15. `/projects/[projectId]/evals/[evalId]` — eval detail

### Primary job

Understand the rubric/performance and start or inspect reviewer runs.

### Current issues

- Four metric cards consume unnecessary vertical space.
- Rubric criteria are each nested cards.
- Run status is rendered as an outline button.

### Proposed structure

Header:

- eval name + dataset relationship
- Start run primary action
- description
- compact progress summary

Main:

- Rubric as a structured list/table with criterion, description, weight, current avg
- Recent runs table with status badge, reviewed progress, pass rate, start/completion timestamp

Avoid cards within cards.

## 16. Eval run reviewer

### Primary job

Review many rows accurately and quickly.

This is a workbench, not a dashboard.

### Proposed layout

- 240-280px sticky row queue on desktop with progress at top.
- center content area for Input / Output comparison.
- 320-380px sticky rubric/review panel where viewport permits, or a bottom/right panel depending width.
- sticky footer/action area with `Save & next` as primary.
- Previous / Next keyboard shortcuts.
- number keys 1-5 for criterion score only when accessible/safe and clearly documented.
- pass/fail should be a segmented choice with semantic state, not generic primary/destructive buttons competing with Save.
- notes autosave/draft behavior should be considered if review sessions are long.
- row queue must visually differentiate pending/pass/fail without oversized badges.

Remove the four MetricCards from the narrow progress rail; use one compact progress module (`18 / 50 reviewed`, progress bar, average score).

## 17. `/login`

### Primary job

Authenticate with minimum cognitive load.

### Current issues

- radial/gradient decorative background
- 2-column marketing composition
- two large feature tiles
- old Waypoints brand mark rather than the canonical image mark
- multiple headings/subheadings before the form

### Proposed structure

- pure/subtle black background
- canonical Captar logo
- one concise title and optional one-line value statement
- focused auth form, max ~380-420px
- minimal security/support footer
- no marketing feature grid

## 18. Component-level rules

### Cards

Cards should mark meaningful regions, not every piece of content.

- Remove default hover translate/lift from non-clickable MetricCards.
- Base surface padding 16-20px for dense console screens.
- Avoid Card > Card nesting wherever spacing/dividers can express hierarchy.
- Page headers are not cards.
- Filter toolbars are not cards.

### Metric cards

Use only for top-level time-windowed operational metrics. Inventory counts and timestamps should usually be inline metadata or compact summary items.

### Tables

- 44-48px ordinary row target.
- ~10-12px vertical cell padding.
- sticky header for long data sets where feasible.
- whole-row click for primary entity navigation, while preserving explicit keyboard/link semantics.
- mono only for IDs.
- right align numeric money/tokens.
- tabular numerals for metrics.
- avoid Buttons as table links; use text link + row affordance.

### Badges

Badges are for status/category, not every count or piece of metadata.

- green: completed/enabled/healthy
- red: failed/destructive
- amber: blocked/pending/warning where semantics fit
- neutral: running/unknown/general category

Counts should usually be plain muted text.

### Buttons

- one clear primary action per region/header where possible
- secondary outline for a genuinely secondary action
- ghost for tertiary/contextual controls
- overflow/dropdown for low-frequency actions such as multiple export formats
- do not repeat navigation buttons already represented in the sidebar/breadcrumb

### Inputs / filters

Explorer pages share one toolbar language. Search + filter selects should have consistent height, labels/accessible names, active-filter indicators, and Reset only when active.

### Empty states

Every empty state should answer:

1. What is empty?
2. Why might it be empty?
3. What is the next useful action?

Do not add large illustration/icon treatment unless it helps comprehension.

## 19. Responsive rules

Desktop is primary because Captar is an operational developer tool, but layouts must remain usable below desktop.

- >=1440: full sidebar, wide table/explorer, optional inspector panel
- 1024-1439: full/compact sidebar, inspector may narrow
- 768-1023: nav becomes drawer/sheet, tables horizontally scroll only where unavoidable, secondary panels stack
- <768: focus on investigation/read actions; dense data tables can become horizontally scrollable rather than pretending every desktop workflow is ideal on mobile

Do not use a horizontally scrolling copy of the full desktop navigation as the final mobile navigation pattern.

## 20. Rebuild order

1. Design tokens, typography, global background
2. App shell + responsive navigation + project context
3. Shared page header / toolbar / status / data-table patterns
4. Projects
5. Project Overview (and decide whether Dashboard merges into it)
6. Traces explorer
7. Trace debugger
8. Guardrail explorer
9. Hook/effective-policy page
10. Datasets list
11. Dataset detail + row inspector
12. Evals list/detail
13. Reviewer workbench
14. Login
15. Loading/error/not-found/empty states
16. Cross-page accessibility and responsive pass
17. Visual regression / interaction verification

## 21. Explicit non-goals

- Do not add generated-concept navigation/features merely because they look good.
- Do not invent analytics that current storage/query layers cannot support.
- Do not add decorative icons to fill space.
- Do not turn every region into a Card.
- Do not deploy production as part of the redesign audit.
