# LibTrack UI Design System

## Visual direction
A premium academic library character: quiet, editorial, book-centered, and suitable for daily circulation work. Do not use generic SaaS dashboard tropes. Use real catalogue imagery only when available and attributed; empty states must not invent inventory or activity.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| forest-950 | `#04382D` | Deep forest surfaces and emphasis |
| forest-900 | `#064E3B` | Primary navigation/actions/headings |
| forest-700 | `#1C735B` | Hover and selected accents |
| ivory-50 | `#FBF9F6` | Page background |
| paper-0 | `#FFFFFF` | Panels and forms |
| sage-100 | `#E4EDE5` | Quiet selection surfaces |
| sage-500 | `#718575` | Secondary accents |
| charcoal-900 | `#202622` | Main text |
| charcoal-600 | `#5D665F` | Supporting text |
| line-200 | `#D8DED6` | Borders/table dividers |
| amber-700 | `#8B5A0A` | Warnings |
| danger-700 | `#A33F38` | Errors/destructive actions |

Verify contrast for actual combinations. Colour alone never conveys a state.

## Typography, spacing, layout
Use Playfair Display for editorial and book headings, with Georgia/serif fallbacks. Use Plus Jakarta Sans for body, controls, and navigation, with system sans fallbacks. The Google Fonts stylesheet is linked from the app shell; the fallbacks keep the interface usable when fonts cannot be fetched. Scale: 12/14 px supporting, 16 px body, 20/24 px section, 30/36 px page titles; body line height about 1.45. Use 4 px spacing increments (8, 12, 16, 24, 32, 48 px), generous whitespace, subtle 1 px borders, low shadows, and 4–8 px control/panel radii.

The authenticated shell uses compact persistent side navigation on desktop and a horizontal navigation strip on small screens. The public root is a library landing page; catalogue search and active book details are also public. Keep dashboards role-specific and operational; no oversized stat cards or fake charts. Catalogue search supports title, author, ISBN, category, and keyword. Tables provide useful filters/sorting, accessible labels, row actions, empty/loading/error states, and responsive overflow.

## Reusable components and accessibility
Shared page header, breadcrumb, search/filter bar, data table/pagination, book result, copy status, status badge, form field, confirmation dialog, notification item, empty state, alert, and loading skeleton. Reactive forms use persistent labels, inline field errors, sensible input types, visible keyboard focus, and clear required indicators. Status text accompanies restrained color/icons. Use small meaningful icons with accessible names; confirm destructive actions.

Support mobile/tablet/desktop without page-level horizontal scrolling. Use semantic landmarks, heading order, labels, keyboard operation, focus visibility, accessible names, and announcements for async results. Target WCAG 2.2 AA. Respect reduced-motion preferences; avoid decorative animation and excessive gradients, neon, rounded cards, or glass effects.

## Angular implementation
The shared foundation lives in `frontend/src/styles.scss`: semantic color tokens, type, spacing, radii, shadows, layout widths, focus treatment, controls, buttons, badges, alerts, cards, empty/loading surfaces, compact data tables, and book-cover/fallback classes. Components use those classes instead of redefining common colors and controls.

The sign-in dialog follows the supplied forest-green segmented-selector reference and preserves the existing email/password session API; role selection never grants authority. It provides Student/Faculty self-registration with only institutional email, password, and confirmation. Registration shows pending verification and does not authenticate or activate the account; Librarian registration remains absent.

Keyboard focus is visible, forms have persistent labels and inline error associations, status colors are paired with text, dialog close/Escape and role-tab arrow navigation are supported, and reduced-motion preferences are respected. The browser's native modal dialog provides modality and focus restoration. Automated component/build checks are run for regressions; an independent WCAG contrast audit remains outstanding.
