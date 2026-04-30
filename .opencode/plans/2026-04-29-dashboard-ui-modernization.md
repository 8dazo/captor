# Dashboard UI Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the platform dashboard UI with the marketing app's shadcn/new-york design system, replacing hardcoded styles with semantic CSS variables, adding missing components, and fixing per-page cosmetic issues.

**Architecture:** Migrate the platform app from hardcoded Tailwind color classes (`bg-slate-950`, `text-cyan-300`) to a shadcn CSS variable system scoped to dark mode. Install ~7 missing shadcn components (Select, Avatar, Tooltip, Skeleton, Breadcrumb, DropdownMenu, Sonner). Unify duplicated components (MetricCard, Badge). Fix per-page issues (raw `<select>`, raw `<button>`, missing copy buttons, no toasts). All changes are cosmetic — no functional behavior changes.

**Tech Stack:** shadcn/ui (new-york style), Radix UI primitives, Tailwind CSS + tailwindcss-animate, class-variance-authority, lucide-react, Sonner (toasts), next-themes (dark-only enforcement)

---

## Issue Breakdown (14 GitHub Issues)

### Issue 1: Platform theme foundation — CSS variables + tailwind config + components.json

**Files:**

- Modify: `apps/platform/app/globals.css`
- Modify: `apps/platform/tailwind.config.ts`
- Create: `apps/platform/components.json`
- Modify: `apps/platform/package.json` (add `tailwindcss-animate`, `next-themes`)

**What:** Replace hardcoded color classes with a CSS variable design system matching marketing's dark theme. Add `components.json` for shadcn CLI. Add `tailwindcss-animate` plugin. Add `<ThemeProvider>` (dark-only) to root layout.

**CSS Variable Mappings (dark-only):**
| Token | Current Hardcoded | New CSS Variable Value |
|---|---|---|
| `--background` | `bg-slate-950` | `0 0% 3.9%` |
| `--foreground` | `text-slate-100` | `0 0% 98%` |
| `--card` | `bg-slate-950/80` → layered | `0 0% 4%` |
| `--card-foreground` | `text-slate-100` | `0 0% 98%` |
| `--popover` | (none) | `0 0% 4%` |
| `--popover-foreground` | (none) | `0 0% 98%` |
| `--primary` | `bg-cyan-400` | `186 94% 60%` |
| `--primary-foreground` | `text-slate-950` | `0 0% 3.9%` |
| `--secondary` | `bg-slate-900/60` | `0 0% 15%` |
| `--secondary-foreground` | `text-slate-100` | `0 0% 98%` |
| `--muted` | `bg-slate-900/40` | `0 0% 15%` |
| `--muted-foreground` | `text-slate-400` | `0 0% 55%` |
| `--accent` | `bg-slate-900/60` | `0 0% 15%` |
| `--accent-foreground` | `text-slate-100` | `0 0% 98%` |
| `--destructive` | `text-rose-300` | `0 84% 60%` |
| `--destructive-foreground` | (none) | `0 0% 98%` |
| `--border` | `border-slate-800` | `0 0% 15%` |
| `--input` | `border-slate-700` | `0 0% 20%` |
| `--ring` | `ring-cyan-300` | `186 94% 60%` |
| `--radius` | (none, inconsistent) | `0.75rem` |

Key decisions:

- `--primary` maps to cyan (the dashboard's accent color), unlike marketing where primary is near-black/white
- `--radius` set to `0.75rem` (12px) to match dashboard's existing `rounded-xl` preference
- Keep the radial gradient background as a utility class, not a CSS variable

---

### Issue 2: Install missing shadcn components

**Files:**

- Create: `apps/platform/components/ui/select.tsx`
- Create: `apps/platform/components/ui/avatar.tsx`
- Create: `apps/platform/components/ui/tooltip.tsx`
- Create: `apps/platform/components/ui/skeleton.tsx`
- Create: `apps/platform/components/ui/breadcrumb.tsx`
- Create: `apps/platform/components/ui/dropdown-menu.tsx`
- Create: `apps/platform/components/ui/sonner.tsx`
- Modify: `apps/platform/package.json`
- Modify: `apps/platform/app/layout.tsx` (add `<Toaster />`)
- Create/Modify: `apps/platform/app/providers.tsx` (add `<TooltipProvider>`)

**What:** Use `npx shadcn@latest add` for each component. Add Radix animation keyframes to tailwind config. Add Toaster to layout. Add TooltipProvider to providers.

Installation order: select, avatar, tooltip, skeleton, breadcrumb, dropdown-menu, sonner

---

### Issue 3: Unify MetricCard

**Files:**

- Modify: `apps/platform/components/metric-card.tsx`
- Modify: `apps/platform/app/projects/[projectId]/dashboard/page.tsx`
- Modify: `apps/platform/app/projects/[projectId]/page.tsx`
- Modify: `apps/platform/app/hooks/[hookId]/page.tsx`
- Modify: `apps/platform/app/traces/[traceId]/page.tsx`
- Modify: `apps/platform/app/projects/[projectId]/evals/[evalId]/page.tsx`
- Modify: `apps/platform/app/projects/[projectId]/datasets/[datasetId]/page.tsx`

**What:** Unify the two MetricCard implementations into one component with variants:

- `variant="default"`: standard metric card
- `variant="primary"`: cyan accent (for hover/highlight)
- `variant="success"`: emerald accent (for spend metrics)
- Props: `label`, `value`, `icon?`, `href?`, `className?`

Remove local MetricCard, SpendCard, and StatusBadge from dashboard/page.tsx. Replace all inline stat boxes.

---

### Issue 4: Badge status variants + custom components

**Files:**

- Modify: `apps/platform/components/ui/badge.tsx`
- Modify: `apps/platform/app/projects/[projectId]/dashboard/page.tsx`
- Create: `apps/platform/components/copy-button.tsx`
- Create: `apps/platform/components/code-block.tsx`
- Create: `apps/platform/components/file-upload.tsx`

**What:**

- Add `status` variant to Badge with sub-variants: completed (emerald), failed (rose), blocked (amber), pending (slate)
- CopyButton: icon button that copies to clipboard + shows Sonner toast
- CodeBlock: `<pre>` wrapper with copy button, language label, semantic token colors
- FileUpload: styled file input wrapper replacing raw `<input type="file">`

---

### Issue 5: Login page improvements

**Files:**

- Modify: `apps/platform/app/login/page.tsx`

**What:**

- Add loading state to submit Button (disabled + spinner during useTransition)
- Replace inline error `<p>` with Sonner toast
- Verify gradient background uses semantic tokens

---

### Issue 6: Projects page improvements

**Files:**

- Modify: `apps/platform/app/projects/page.tsx`
- Modify: `apps/platform/components/project-create-form.tsx`

**What:**

- Add search/filter Input above project cards
- Move create form into Dialog triggered by a CTA Button
- Replace text-only links with `<Button variant="outline" asChild><Link>`
- Card hover effects use semantic tokens
- Add Sonner toasts for create success/error

---

### Issue 7: Project detail page improvements

**Files:**

- Modify: `apps/platform/app/projects/[projectId]/page.tsx`

**What:**

- Replace 5 inline stat boxes with unified MetricCard
- Replace raw `<pre>` code snippet with CodeBlock (with copy button)
- Replace text-only links with `<Button variant="outline" asChild><Link>`
- Add Breadcrumb: Projects > [Project Name]
- Add Sonner toasts for hook creation

---

### Issue 8: Dashboard page improvements

**Files:**

- Modify: `apps/platform/app/projects/[projectId]/dashboard/page.tsx`

**What:**

- Remove local MetricCard, SpendCard, StatusBadge definitions
- Use unified MetricCard for all metric cards
- Use Badge status variant for trace statuses
- SpendCard: extract or add variant to MetricCard
- All Cards use semantic tokens
- Add Breadcrumb

---

### Issue 9: Datasets pages improvements

**Files:**

- Modify: `apps/platform/app/projects/[projectId]/datasets/page.tsx`
- Modify: `apps/platform/app/projects/[projectId]/datasets/[datasetId]/page.tsx`
- Modify: `apps/platform/components/dataset-import-form.tsx`

**What:**

- Replace DatasetExportLink inline styles with `<Button variant="outline" asChild><a>`
- Replace raw `<select>` with shadcn Select
- Replace raw file input with FileUpload component
- Replace text-only links with Button outline+Link
- Add Breadcrumb
- Add Sonner toasts

---

### Issue 10: Evals pages improvements

**Files:**

- Modify: `apps/platform/app/projects/[projectId]/evals/page.tsx`
- Modify: `apps/platform/app/projects/[projectId]/evals/[evalId]/page.tsx`

**What:**

- Add empty state component for "No evals yet"
- Add Breadcrumb
- Replace cyan links with `<Button variant="outline" asChild><Link>`
- Ensure MetricCard consistency
- Fix mixed border-radius (use `rounded-xl` consistently)

---

### Issue 11: Run reviewer page improvements

**Files:**

- Modify: `apps/platform/app/projects/[projectId]/evals/[evalId]/runs/[runId]/page.tsx`
- Modify: `apps/platform/components/manual-eval-run-reviewer.tsx`

**What:**

- Replace raw `<select>` with shadcn Select
- Fix verdict button colors: Pass=emerald/primary, Fail=destructive/rose
- Add Skeleton loading state for reviewer workspace
- Add progress indicator
- Replace inline error/success `<p>` with Sonner toasts
- Add Breadcrumb

---

### Issue 12: Hook detail page improvements

**Files:**

- Modify: `apps/platform/app/hooks/[hookId]/page.tsx`

**What:**

- Replace 4 inline stat boxes with MetricCard
- Replace raw JSON `<pre>` with CodeBlock
- Add CopyButton next to hook public ID
- Replace text-only links with Button outline+Link
- Add Breadcrumb
- Add Tooltip on icon buttons

---

### Issue 13: Trace detail page improvements

**Files:**

- Modify: `apps/platform/app/traces/[traceId]/page.tsx`
- Modify: `apps/platform/components/trace-dataset-export-card.tsx`

**What:**

- Replace raw `<select>` with shadcn Select
- Improve TraceTreeNode with CSS padding/tree lines
- Add CopyButton next to trace ID
- Replace hardcoded banners with semantic Alert/Callout
- Add Breadcrumb
- Improve timeline visualization with semantic colors

---

### Issue 14: Cross-cutting — loading skeletons, error boundaries, AppShell

**Files:**

- Modify: All `apps/platform/app/**/loading.tsx` files (11 files)
- Modify: All `apps/platform/app/**/error.tsx` files (4 files)
- Modify: `apps/platform/app/not-found.tsx`

**What:**

- Wrap all loading skeleton content in `<AppShell>`
- Use shadcn `<Skeleton>` instead of plain `animate-pulse` divs
- Replace raw `<button>` in error boundaries with `<Button>`
- Add AppShell wrapper to error and not-found pages

---

## Execution Order

1. **Issue 1** (theme foundation) — must be first
2. **Issue 2** (shadcn components) — must be second
3. **Issue 3** (MetricCard unification) — depends on theme tokens
4. **Issue 4** (Badge + custom components) — depends on theme + Sonner
5. **Issues 5-13** (page improvements) — can be parallelized after 1-4
6. **Issue 14** (cross-cutting) — can be parallelized with 5-13

## Verification

After each issue:

1. Run `pnpm --filter platform dev` and visually verify
2. Run `pnpm --filter platform lint` and `pnpm --filter platform typecheck`
3. Verify dark mode renders correctly (no light mode flash)
4. Verify all interactive elements still work
