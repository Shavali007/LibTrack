# LibTrack UI Design System

## Visual direction
A premium academic library character: quiet, editorial, book-centered, and suitable for daily circulation work. Do not use generic SaaS dashboard tropes. Use real catalogue imagery only when available and attributed; empty states must not invent inventory or activity.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| forest-900 | `#173B32` | Primary navigation/actions/headings |
| forest-700 | `#28594A` | Hover and selected accents |
| ivory-50 | `#FAF8F1` | Page background |
| paper-0 | `#FFFFFF` | Panels and forms |
| sage-100 | `#E5EDE5` | Quiet selection surfaces |
| sage-500 | `#718575` | Secondary accents |
| charcoal-900 | `#202622` | Main text |
| charcoal-600 | `#5D665F` | Supporting text |
| line-200 | `#D8DED6` | Borders/table dividers |
| amber-700 | `#8B5A0A` | Warnings |
| danger-700 | `#A33F38` | Errors/destructive actions |

Verify contrast for actual combinations. Colour alone never conveys a state.

## Typography, spacing, layout
Use a restrained licensed serif only for editorial/book headings; use readable system sans for controls and body. Scale: 12/14 px supporting, 16 px body, 20/24 px section, 30/36 px page titles; body line height about 1.45. Use 4 px spacing increments (8, 12, 16, 24, 32, 48 px), generous whitespace, subtle 1 px borders, low shadows, and 4–8 px control/panel radii.

Authenticated shell uses compact persistent side navigation on desktop and collapsible navigation on small screens. Give every page a specific title and task context. Keep dashboards role-specific and operational; no oversized stat cards or fake charts. Catalogue search supports title, author, ISBN, category, keyword. Tables provide useful filters/sorting, accessible labels, row actions, empty/loading/error states, and responsive overflow.

## Reusable components and accessibility
Shared page header, breadcrumb, search/filter bar, data table/pagination, book result, copy status, status badge, form field, confirmation dialog, notification item, empty state, alert, and loading skeleton. Reactive forms use persistent labels, inline field errors, sensible input types, visible keyboard focus, and clear required indicators. Status text accompanies restrained color/icons. Use small meaningful icons with accessible names; confirm destructive actions.

Support mobile/tablet/desktop without page-level horizontal scrolling. Use semantic landmarks, heading order, labels, keyboard operation, focus visibility, accessible names, and announcements for async results. Target WCAG 2.2 AA. Respect reduced-motion preferences; avoid decorative animation and excessive gradients, neon, rounded cards, or glass effects.


## Angular implementation

The shared foundation lives in `frontend/src/styles.scss`: color aliases and semantic colors, type, spacing, radii, shadows, layout widths, focus treatment, controls, buttons, badges, alerts, cards, empty/loading surfaces, compact data tables, and book-cover/fallback classes. Components use those classes instead of redefining common colors and controls.

The authenticated application shell uses a persistent desktop sidebar, a compact header with the current account and sign-out action, a main content landmark, and a footer. At tablet/mobile widths, navigation becomes a compact horizontal strip. It intentionally contains only the workspace entry and Librarian account provisioning link; role dashboards and library workflows remain unimplemented. The login route remains outside the authenticated shell and keeps the existing session/CSRF auth service flow.

Keyboard focus is visible, forms have persistent labels and inline error associations, state colors are paired with text, and reduced-motion preferences are respected. Confirm actual combinations in automated contrast review before a public accessibility claim; this implementation uses high-contrast forest, charcoal, amber, and danger text on light surfaces.
