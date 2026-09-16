# Captar Platform UI/UX Findings

This file records source-level findings from the `apps/platform` audit. It complements [`ui-ux-audit.md`](./ui-ux-audit.md), which defines the target system and page layouts.

## Audit status

Reviewed:

- root layout, root redirect, global CSS
- application shell and navigation
- login page + credentials form
- Projects page + project creation
- Project Overview
- Project Dashboard
- Trace Explorer
- Trace Detail / Debugger
- Guardrail / Violation Explorer
- Hook Detail
- Datasets list
- Dataset Detail
- Evals list
- Eval Detail
- Eval Run page + reviewer workbench
- MetricCard, Card, Button, Table, Badge, Input
- Hugeicons abstraction
- SpendBreakdownCard
- PayloadCard
- TraceDatasetExportCard
- FileUpload
- CopyButton
- CodeBlock
- TraceAutoRefresh
- Project/Hook/Dataset/Eval creation/import actions
- root and representative route loading/error/not-found states
- trace/violation/spend query support
- Prisma storage model relevant to visible platform data
- historical April dashboard-modernization plan

## Severity language

- **Blocker**: platform would show materially misleading or incorrect data/state.
- **High**: breaks an important workflow, navigation context, accessibility, or debugging efficiency.
- **Medium**: creates substantial visual/interaction friction.
- **Low**: polish/consistency issue.

---

## Cross-cutting correctness findings

### Blocker — persisted money precision is weaker than SDK accounting

Tracked by #208.

The SDK now preserves pico-USD accounting internally, while platform schema stores session, trace, and spend-ledger money in `Decimal(..., 6)`. Sub-micro charges can therefore disappear or round again after ingest.

UI consequence: do not describe platform totals as exact runtime truth until storage and ingest preserve supported SDK precision. Display rounding remains separate from storage precision.

### High — hard-coded trust indicators

Tracked by #209.

`AppShell` renders `All systems operational` / `Operational` with no health query. It also renders `Runtime protection active` for every signed-in context. Project cards add `Authenticated observability ready` as a static phrase.

These statements look like live system state but are not backed by state. Remove them or replace them with data-backed status.

### High — project context disappears on trace/hook routes

Tracked by #209.

`AppNavigation` derives `projectId` from `/projects/:projectId/...` only. `/traces/:traceId` and `/hooks/:hookId` therefore lose the Current project navigation group even though the loaded resources are project-owned.

The redesign must preserve project context across resource-detail routes, either by using project-scoped URLs or by passing/deriving project context in the shell.

### High — one-project redirect hides the New Project workflow

Tracked by #209.

`/projects` redirects when the user has exactly one project. The `New project` action is on `/projects`, so a one-project user has no normal UI path to create a second project.

Remove the redirect or add a real global project switcher/create action that keeps the project index reachable.

### High — missing favicon referenced by metadata

`app/layout.tsx` declares `/favicon.ico`, but that file is absent. Use the canonical app icon through Next metadata conventions and ensure declared OpenGraph image dimensions match the actual asset.

### High — trace tree indentation uses dynamic Tailwind class generation

Trace Detail constructs a class like `pl-${Math.min(span.depth * 3, 12)}`. Tailwind cannot reliably discover arbitrary runtime class strings, so deeper indentation can be missing from production CSS.

Use inline style/CSS variable, a finite static class map, or a structural tree-line implementation.

### Medium — raw error messages are user-visible

Root/segment error boundaries pass `error.message` directly into `ErrorState`. Production exceptions can contain implementation detail. Render a safe message and optional diagnostic/digest reference; log technical context separately.

---

## Data-truth matrix

The redesign may only show a dashboard element as a current feature when the storage/query layer supports it.

| Concept | Current support | Decision |
| --- | --- | --- |
| Projects | Yes | first-class route |
| Hook connections + environments | Yes | first-class on Overview / hook detail |
| Sessions | Stored (`LLMSession`) | valuable proposed route/inspector, but not currently implemented as project-wide page |
| Traces | Yes | first-class explorer |
| Trace spans/tree/timeline | Yes | first-class debugger |
| Violations/guardrails | Yes | first-class explorer |
| Token counts | Yes | show with appropriate missing-value semantics |
| Estimated/actual trace cost | Yes, subject to #208 precision | show provenance/confidence where available |
| Provider/model spend breakdown | Yes, 30-day query exists | supported |
| Date-range trace/violation filtering | No current explorer support | backend requirement before showing range selector |
| Pagination beyond latest 100 traces/violations | No | implementation requirement; do not hide truncation |
| Aggregate latency dashboard | Not currently queried/stored as direct aggregate; derivable from timestamps/spans | do not fake; add query first |
| `p95` / `p99` latency | No current query | do not show until implemented |
| Budget saved / money saved | No trustworthy counter | do not show |
| Alerts / anomaly feed | No alert model/workflow | do not show as current nav/page |
| Provider integrations catalog | No integration model matching generated mockup | do not show |
| Dedicated Budgets page | Budget lives in policy JSON/runtime config | prefer policy editor until a real budget entity/workflow exists |
| Dedicated Tools page | Tool activity is span/event data, not a first-class current page | keep in traces until a clear tool-level job/query exists |
| Team/member settings | ProjectMember data exists, but no audited settings workflow yet | future product scope, not part of current mockup claims |
| Payload retention | Yes | visible on hooks/traces/datasets where relevant |
| Datasets | Yes | first-class |
| Manual evals/runs | Yes | first-class |

## Recommended information architecture

Current nav has both `Overview` and `Dashboard`, which duplicate user jobs.

Target project nav:

1. Overview
2. Traces
3. Guardrails
4. Datasets
5. Evals

Potential future item after a dedicated design/data pass:

- Sessions — the data model supports it and session-level budgets/counters are strategically relevant, but it should be added because a real user job is designed, not because the generated concept included it.

Do not add Alerts, Integrations, Budgets, Tools, Analytics, or Settings as empty/generated-concept sections.

---

## Source-level page findings

### Root `/`

Current behavior (auth -> Projects/Login redirect) is correct and should stay visually invisible.

### Login

**Keep**

- focused credential form
- proper autocomplete
- pending state
- generic invalid-credential message

**Remove / change**

- radial/gradient decoration
- split-screen marketing layout
- two feature-marketing tiles
- obsolete Waypoints mark
- input icons are optional; labels already make fields clear
- `Continue to platform` can simply be `Sign in`
- do not make unverified security claims in footer copy

Target: single, quiet, centered authentication panel using the canonical Captar mark.

### Projects

**Problems**

- card grid is inefficient for scanning
- hook count is repeated
- static readiness phrase is not state
- hover lift is unnecessary
- single-project redirect blocks project management workflow

**Target**

Dense list/table with Project, hook/environment summary, sessions/traces/recent activity when cheaply available, and row actions. `New project` remains primary action. Search belongs in the collection toolbar.

### Project Overview

**Problems**

- page header inside card
- five KPI cards mix inventory and runtime concepts
- `Policy scope` largely duplicates Hooks
- operational Hook table appears too low
- permanent documentation cards (`What this project manages`, integration pattern)
- Datasets/Evals cards duplicate nav

**Target**

Hook/connection state is primary. Use real runtime summary only if time-windowed query support is explicit. Show setup code contextually for empty/new projects or behind an action.

### Dashboard

Recommendation: merge into Overview.

If retained, keep only time-windowed runtime health + spend/activity. Dataset/eval/hook inventory counts are not top KPIs.

Current spend summary should become one coherent spend region, not Reserved/Committed/Net as three equal cards.

### Trace Explorer

**Keep**

- URL-backed query state
- real facets
- actual/estimated cost distinction
- useful table columns

**Change**

- remove header card
- replace four KPI cards with compact inline summary
- remove Filters card; toolbar directly above table
- replace native selects with shared Select/Filter primitive
- remove redundant Back to Dashboard
- whole-row navigation
- real pagination and time range require data-layer work

### Trace Detail

**Keep data, redesign representation.**

The current page duplicates the same story through Problem card, Problems tab, Violations tab, Tree, Span Summary, Timeline, Events, Prompt, Response.

Target is one execution explorer with contextual inspector. Problem/violation state annotates the relevant span. Payload/raw attributes live in inspector. Dataset export becomes contextual action.

Additional bug: dynamic `pl-${...}` Tailwind indentation.

Live polling should be a small `Live` status indicator, not a full-width banner.

### Guardrail Explorer

Mirror Trace Explorer exactly for toolbar/table behavior. Raw event type should be metadata; normalized outcome/category should be easiest to scan.

No separate Filters card or four equal KPI cards.

### Hook Detail

**Current problem**: Sessions / Traces / Policy / Violations are isolated tabs even though debugging usually needs effective policy and activity together.

Target:

- compact identity/status header
- hook ID + copy
- environment, retention, ingest/policy-sync state
- structured effective-policy region
- recent activity/violations beside/below it
- raw JSON secondary
- setup code behind action

Session/traces/violation/spend numbers become compact summary, not four floating cards.

### Datasets list

Creation is occasional; remove permanent 380px form. Use `New dataset` dialog/sheet. Dataset list/table owns canvas.

### Dataset detail

**Problems**

- Created/Updated displayed as metric cards
- 3 export-format buttons
- persistent 380px Create Eval + Import forms
- full payload JSON in table cells makes rows unscannable
- metadata JSON in table cells

**Target**

Header actions: New Eval, Import, Export dropdown. Dense rows table with truncated input/output. Row selection opens inspector for payload, metadata, source, retention. Related evals become secondary relationship region/tab.

### Evals list

Table is correct. Remove header card. Use normal links instead of outline buttons inside cells. Add scan-friendly review progress and current/latest run state where available.

Empty state needs a real action: choose/open a dataset to create an eval.

### Eval detail

Compress four metrics into progress/header summary. Rubric becomes structured list, not nested cards. Run status uses badge/text link, not outline-button-as-cell-content.

### Eval run/reviewer

This page should behave like a labeling/review workbench.

Target desktop:

- sticky 240-280px row queue
- large input/output content area
- sticky 320-380px rubric/review panel where width allows
- Save & Next sticky action
- keyboard Previous/Next
- optional documented number shortcuts for scores

Current four progress MetricCards in 300px rail waste space. Pass/Fail should be segmented semantic choice. Long-running review should consider draft/autosave behavior.

### Not found / error / loading

404 composition is acceptable but should use canonical mark and contextual return link.

Errors must not dump arbitrary server messages.

Skeletons should reuse page-shape primitives and match redesigned page hierarchy; avoid one-off skeleton copies that recreate removed card rows.

---

## Component findings

### AppShell

- remove decorative grid
- reduce top bar/sidebar chrome
- add real project context/switcher
- remove fake operational/protection indicators
- replace mobile horizontal-nav strip with drawer/sheet

### AppNavigation

- preserve context on trace/hook details
- selected state should be subtle dark surface/accent, not white rectangle
- use current route group consistently

### MetricCard

- `primary` and `success` variants currently do not meaningfully differ
- hover lift currently applies even when not clickable
- use only for high-value operational metrics
- no icon required by default

### Card

Base Card is structurally fine but 24px default padding is too large for dense operational pages. Target 16-20px in most regions.

### Table

Current table foundation is usable.

Change defaults/patterns:

- reduce cell vertical padding
- sticky header when long
- tabular numerals
- row-link pattern
- no Button components merely to render entity names
- status first only where it is the key scanning dimension

### Badge

Status variants are useful. Stop using generic badges for ordinary counts/metadata.

### Buttons

Limit prominent actions. Export formats belong in dropdown. Navigation already present in sidebar/breadcrumb should not reappear as button rows.

### Inputs

Current 40px input is acceptable; 36-40px target. Search inputs may include Search icon. Ordinary email/password fields do not need icons when labels are clear.

### Icons

Hugeicons is already a coherent centralized icon dependency. Keep it. Standardize 16/18/20 sizing and reduce decorative usage rather than replacing the library.

### CopyButton

- add `aria-label` / accessible name internally
- add optional tooltip at call sites or built-in title
- catch clipboard failure and show failure feedback
- 14-16px icon is correct

### FileUpload

Current control does not display the selected filename. Show selected file name + size/type and a clear/remove action. Import should expose parsing/error feedback near the file state.

### PayloadCard / CodeBlock

Useful primitives for inspectors. Do not embed full JSON payloads inside table cells.

### TraceAutoRefresh

Keep visibility-aware polling, but represent it as a small live indicator/status near trace state instead of a full-width banner.

### Forms

- ProjectCreate: appropriately small dialog workflow.
- HookCreate: environment must use controlled choices/combobox rather than arbitrary free text if environment is semantic.
- DatasetCreate: move to dialog/sheet.
- DatasetImport: move to dialog/sheet; show selected file state.
- ManualEvalCreate: use dedicated dialog/full workflow; criteria repeater should use stable generated IDs rather than index+label keys.
- ManualEvalStartRun: use toast/safe inline error consistent with rest of platform.

---

## Visual-density decisions

### Remove card when

- it only wraps page title/description
- it only wraps filters
- it only creates separation that a heading/divider/gap can provide
- it duplicates sidebar navigation
- it contains one line of explanatory documentation

### Keep card/surface when

- it groups a coherent inspector or form
- it has independent interaction/state
- it contains a chart/table module that benefits from a bounded surface
- it is an optional contextual panel

### KPI acceptance test

A top-level KPI must be:

1. operationally relevant,
2. time-windowed or clearly all-time,
3. backed by current data,
4. meaningful without opening another page,
5. comparable to adjacent KPIs.

Dataset count, created timestamp, hook inventory, and similar metadata generally fail this test.

---

## New backend/query work required by desired UX

These are not cosmetic and must be implemented before their UI appears:

- project-aware routing/context for hook/trace detail (#209)
- spend persistence precision (#208)
- real trace/violation pagination
- date-range filtering for explorers if range controls are shown
- aggregate latency query before latency KPI/percentile charts
- data-backed system/protection health before any global health badge
- optional project-wide Sessions query/detail if Sessions is added to nav

## Existing plan disposition

`.opencode/plans/2026-04-29-dashboard-ui-modernization.md` was intentionally cosmetic. Many of its shadcn/primitives improvements are useful and already present, but its page-level decisions (more MetricCards, links rendered as buttons, card-based sections, purely cosmetic scope) should not guide the new rebuild.

The new audit supersedes that plan for information architecture and UX decisions.
