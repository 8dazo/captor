# Marketing redesign (#235)

## Positioning

“Let it run. Know when to stop.” Captor adds per-run boundaries inside existing applications. The landing page introduces that idea; API details and operational boundaries stay in the documentation. The execution runtime remains the product scope. This redesign does not promise shared daily budgets or additional provider support.

## Visual references inspected

- https://trigger.dev/ — dark product-led hero, code evidence, direct start action.
- https://www.inngest.com/ — oversized typography, generous spacing, technical motion.
- https://langfuse.com/ — high-contrast typography and visible product evidence.

The implementation uses original copy and components with Captor branding. Palette: graphite, warm ivory, signal yellow. Three primary sections replace the dense feature narrative. No customer logos, usage figures, or testimonials are invented.

## Interaction and accessibility

- Demo illustrates six local work items and a configurable 2–6 request ceiling. It sends no network requests and is labeled as an illustration.
- Replay animates the used count and stops before the first request beyond the chosen limit. Six admitted requests show completion.
- Pause motion stops ambient animation and pauses an active demo. Reduced-motion preference removes decorative animation and shows the result immediately when the demo runs.
- Native range input, named buttons, live result text, keyboard focus outlines, skip link, and an Escape-dismissible mobile navigation disclosure.
- Install command copy includes failure feedback; normal text selection remains available.

## Validation

Local production build includes ESLint and TypeScript checks. Browser verification and delivery evidence are recorded in `.ai/session-handoff.md`. SDK code is unchanged by the redesign; prior reliability work is carried forward in the branch.
