# LibTrack Unified Design System & Typography Specification

> **Mandatory UI Standard**: All current and future pages in the LibTrack application (Librarian, Student, Faculty, and Public workspaces) must adhere to this specification. Do not introduce arbitrary font sizes, independent color definitions, custom button styles, or ad-hoc table/card layouts without documented justification.

---

## 1. Design Philosophy

LibTrack is a premium academic library management system. The interface conveys scholarly elegance, intellectual authority, and operational clarity.

- **Primary Accent**: Deep Forest Green (`#003D30` / `var(--color-primary)`).
- **Secondary / Supporting Accents**: Sage Green (`#C2D6CF` border, `#EAF2EF` tint background).
- **Backgrounds**: Warm academic paper tones (`#FDFCF9` app background, `#F6F4EE` sub-canvas, `#FFFFFF` surface cards).
- **Borders & Dividers**: Subtle warm lines (`#E5E0D5` default, `#D8D2C4` active/control borders).
- **Typography**: Dual-font architecture:
  - **Serif** (`Playfair Display`, `Georgia`, serif): Reserved for authoritative page titles (`h1`), welcome banners, and scholarly display numbers.
  - **Sans-Serif** (`Plus Jakarta Sans`, `Inter`, -apple-system, sans-serif): Used for functional UI, section headers (`h2`), card headings (`h3`), form labels, buttons, tables, badges, and body text.

---

## 2. Centralized Typography Scale & Tokens

All font sizes, weights, and line heights are standardized in [`frontend/src/styles.scss`](file:///c:/Users/maham/Documents/Codex/2026-10-24/files-mentioned-by-the-user-library/libtrack/frontend/src/styles.scss).

### 2.1 Base Scale Tokens

| Token | CSS Variable | Rem Value | Approximate Pixels | Typical Usage |
| :--- | :--- | :--- | :--- | :--- |
| `2xs` | `--font-size-2xs` | `0.6875rem` | 11px | Micro-eyebrows, compact tags |
| `xs` | `--font-size-xs` | `0.75rem` | 12px | Table headers, badges, helper text, stat labels |
| `sm` | `--font-size-sm` | `0.84375rem` | 13.5px | Secondary text, descriptions, table body, small buttons |
| `base` | `--font-size-base` | `0.875rem` | 14px | Body copy, standard buttons, input text, form labels |
| `md` | `--font-size-md` | `0.9375rem` | 15px | Subsection headings, emphasis text |
| `lg` | `--font-size-lg` | `1.0625rem` | 17px | Card headings (`h3`), modal titles |
| `xl` | `--font-size-xl` | `1.25rem` | 20px | Section headings (`h2`), panel titles |
| `2xl` | `--font-size-2xl` | `1.6875rem` | 27px | Page titles (`h1`), hero banners |
| `3xl` | `--font-size-3xl` | `2.125rem` | 34px | Large stat values, numeric highlights |
| `4xl` | `--font-size-4xl` | `2.625rem` | 42px | Display metrics |

### 2.2 Semantic Typography Tokens

| UI Element | Size Token | Weight Token | Line Height Token | Font Family | Example Computed Style |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `--type-page-title-size` (`1.6875rem` / ~27px) | `--type-page-title-weight` (`600`) | `--type-page-title-line-height` (`1.25`) | `--font-serif` | `font: 600 1.6875rem/1.25 Playfair Display, serif` |
| **Page Subtitle** | `--type-page-subtitle-size` (`0.84375rem` / ~13.5px) | `--type-page-subtitle-weight` (`400`) | `--type-page-subtitle-line-height` (`1.45`) | `--font-sans` | Color: `var(--color-charcoal-600)` |
| **Section Heading** | `--type-section-heading-size` (`1.25rem` / ~20px) | `--type-section-heading-weight` (`600`) | `--type-section-heading-line-height` (`1.3`) | `--font-sans` | `font: 600 1.25rem/1.3 Plus Jakarta Sans, sans-serif` |
| **Card Heading** | `--type-card-heading-size` (`1.0625rem` / ~17px) | `--type-card-heading-weight` (`600`) | `--type-card-heading-line-height` (`1.35`) | `--font-sans` | Used on `.surface-card h3`, activity cards |
| **Subsection Heading**| `--type-subsection-heading-size` (`0.9375rem` / 15px)| `--type-subsection-heading-weight` (`600`)| `--type-subsection-heading-line-height` (`1.4`) | `--font-sans` | Sub-groups, modal subheadings |
| **Body Text** | `--type-body-size` (`0.875rem` / 14px) | `--type-body-weight` (`400`) | `--type-body-line-height` (`1.5`) | `--font-sans` | Standard descriptive copy, paragraphs |
| **Secondary Desc** | `--type-description-size` (`0.84375rem` / ~13.5px) | `--type-description-weight` (`400`) | `--type-description-line-height` (`1.45`) | `--font-sans` | Color: `var(--color-charcoal-600)` |
| **Form Label** | `--type-form-label-size` (`0.84375rem` / ~13.5px) | `--type-form-label-weight` (`550`) | `--type-form-label-line-height` (`1.35`) | `--font-sans` | Standard form field labels |
| **Input Text** | `--type-input-size` (`0.875rem` / 14px) | `--type-input-weight` (`400`) | `--type-input-line-height` (`1.4`) | `--font-sans` | Inputs, textareas, selects |
| **Table Header** | `--type-table-th-size` (`0.75rem` / 12px) | `--type-table-th-weight` (`600`) | `--type-table-th-line-height` (`1.3`) | `--font-sans` | Uppercase, `letter-spacing: 0.04em` |
| **Table Content** | `--type-table-td-size` (`0.84375rem` / ~13.5px) | `--type-table-td-weight` (`400`) | `--type-table-td-line-height` (`1.45`) | `--font-sans` | Standard table cell data |
| **Button Text** | `--type-button-size` (`0.84375rem` / ~13.5px) | `--type-button-weight` (`600`) | `--type-button-line-height` (`1.2`) | `--font-sans` | Buttons, filter tabs, CTA actions |
| **Navigation Label** | `--type-nav-size` (`0.875rem` / 14px) | `--type-nav-weight` (`550`) | `--type-nav-line-height` (`1.3`) | `--font-sans` | Sidebar and header navigation links |
| **Status Badge** | `--type-badge-size` (`0.75rem` / 12px) | `--type-badge-weight` (`600`) | `--type-badge-line-height` (`1.2`) | `--font-sans` | `.status-badge`, `.status-pill` |
| **Helper Text** | `--type-helper-size` (`0.75rem` / 12px) | `--type-helper-weight` (`400`) | `--type-helper-line-height` (`1.4`) | `--font-sans` | Form hints, footnotes |
| **Empty-State Title** | `--type-empty-title-size` (`1.0625rem` / ~17px) | `--type-empty-title-weight` (`600`)| `--type-empty-title-line-height` (`1.35`) | `--font-sans` | `.empty-state h3` |
| **Empty-State Text** | `--type-empty-body-size` (`0.84375rem` / ~13.5px) | `--type-empty-body-weight` (`400`) | `--type-empty-body-line-height` (`1.45`) | `--font-sans` | `.empty-state p` |
| **Modal Heading** | `--type-modal-title-size` (`1.1875rem` / 19px) | `--type-modal-title-weight` (`600`)| `--type-modal-title-line-height` (`1.3`) | `--font-sans` | `.modal-title`, `.confirm-dialog h2` |
| **Modal Subtitle** | `--type-modal-desc-size` (`0.84375rem` / ~13.5px) | `--type-modal-desc-weight` (`400`)| `--type-modal-desc-line-height` (`1.45`) | `--font-sans` | `.modal-subtitle`, dialog descriptions |
| **Stat Card Value** | `--type-stat-value-size` (`1.6875rem` / ~27px) | `--type-stat-value-weight` (`700`)| `--type-stat-value-line-height` (`1.2`) | `--font-sans` / `--font-serif` | Tabular figures, primary metrics |
| **Stat Card Label** | `--type-stat-label-size` (`0.75rem` / 12px) | `--type-stat-label-weight` (`600`)| `--type-stat-label-line-height` (`1.3`) | `--font-sans` | Uppercase, `letter-spacing: 0.04em` |

---

## 3. Color System

### 3.1 Primary Accent (`#003D30`)
- **Primary Color**: `#003D30` (`var(--color-primary)`, `var(--color-forest-900)`)
- **Primary Hover**: `#002B22` (`var(--color-primary-hover)`, `var(--color-forest-950)`)
- **Soft Background Tint**: `#EAF2EF` (`var(--color-primary-soft)`)
- **Soft Border Tint**: `#C2D6CF` (`var(--color-primary-border)`)

### 3.2 Neutrals & Surfaces
- **Canvas Background**: `#FDFCF9` (`var(--color-bg-canvas)`)
- **Sub-canvas / Banner Background**: `#F6F4EE` / `#F0EFE6`
- **Surface Card**: `#FFFFFF` (`var(--color-surface)`)
- **Line 100 (Subtle)**: `#EFECE6`
- **Line 200 (Default Border)**: `#E5E0D5` (`var(--color-line-200)`)
- **Line 300 (Input / Control Border)**: `#D8D2C4` (`var(--color-line-300)`)
- **Text Primary (Charcoal 900)**: `#1F2421` (`var(--color-charcoal-900)`)
- **Text Secondary (Charcoal 600)**: `#5A625D` (`var(--color-charcoal-600)`)
- **Text Muted (Charcoal 500)**: `#737C76` (`var(--color-charcoal-500)`)

### 3.3 Semantic Status Colors
- **Success / Available / Completed**:
  - Background: `#EAF2EF`
  - Text: `#003D30`
  - Border: `#C2D6CF`
- **Warning / Pending / Due Soon**:
  - Background: `#FEF3C7` (amber-100)
  - Text: `#92400E` (amber-800)
  - Border: `#FDE68A` (amber-200)
- **Danger / Overdue / Rejected / Lost**:
  - Background: `#FEE2E2` (rose-100)
  - Text: `#991B1B` (rose-800)
  - Border: `#FECACA` (rose-200)
- **Info / Neutral**:
  - Background: `#F1F5F9` (slate-100)
  - Text: `#475569` (slate-700)
  - Border: `#E2E8F0` (slate-200)

---

## 4. Standardized Component Patterns

### 4.1 Page Header
Every page starts with a standard page header.

```html
<header class="page-header">
  <div class="page-title-wrap">
    <p class="eyebrow">WORKSPACE MODULE</p>
    <h1 class="page-title">Page Heading</h1>
    <p class="page-subtitle">Explaining subtitle or contextual description.</p>
  </div>
  <div class="header-actions">
    <button type="button" class="button button-primary">Primary Action</button>
  </div>
</header>
```

### 4.2 Section Headings
Section headings separate operational modules within cards or layouts.

```html
<div class="section-heading">
  <div>
    <p class="eyebrow">SUB-SECTION</p>
    <h2 class="section-title">Section Heading</h2>
    <p class="section-subtitle">Supporting context.</p>
  </div>
  <div class="section-actions">...</div>
</div>
```

### 4.3 Stat Cards
Stat cards present operational KPIs across Librarian, Student, and Faculty dashboards.

```html
<div class="stats-overview-grid">
  <div class="stat-card">
    <div class="stat-meta">
      <span class="stat-label">Total Books</span>
      <span class="stat-value">1,420</span>
    </div>
    <span class="stat-trend">+12 this month</span>
  </div>
</div>
```

### 4.4 Data Tables
Standardized data tables must be wrapped in `.data-table-wrap`.

```html
<div class="data-table-wrap">
  <table class="data-table">
    <thead>
      <tr>
        <th>Borrower</th>
        <th>Book Title</th>
        <th>Due Date</th>
        <th>Status</th>
        <th class="actions-header">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="primary-cell">Alice Chen</td>
        <td>Introduction to Algorithms</td>
        <td>Nov 14, 2026</td>
        <td><span class="status-badge status-badge-success">Active</span></td>
        <td class="actions-cell">
          <button class="button button-sm button-secondary">Details</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 4.5 Filter Tabs & Search Bars
```html
<div class="filter-tabs-bar">
  <button type="button" class="tab-btn active">All (12)</button>
  <button type="button" class="tab-btn">Pending (4)</button>
  <button type="button" class="tab-btn">Approved (8)</button>
</div>
```

### 4.6 Buttons
- `.button.button-primary`: `#003D30` background, `#FFFFFF` text. Used for main affirmative actions.
- `.button.button-secondary`: `#FFFFFF` background, `#D8D2C4` border, `#1F2421` text. Used for neutral/secondary actions.
- `.button.button-danger`: `#991B1B` background, `#FFFFFF` text. Used for destructive actions (e.g. Delete, Cancel).
- `.button.button-quiet` or `.button.button-ghost`: Transparent background, hover tint.

### 4.7 Modals & Confirmation Dialogs
Standard modal markup uses `.modal-backdrop`, `.confirm-dialog` (or `.modal-card`), `.modal-title`, and `.modal-actions`.

```html
<div class="modal-backdrop">
  <div class="confirm-dialog" role="dialog" aria-modal="true">
    <div class="modal-header">
      <h2 class="modal-title">Confirm Action</h2>
      <p class="modal-subtitle">Are you sure you wish to proceed with this operation?</p>
    </div>
    <div class="modal-actions">
      <button class="button button-secondary" type="button">Cancel</button>
      <button class="button button-primary" type="button">Confirm</button>
    </div>
  </div>
</div>
```

---

## 5. Mandatory Rules for Student & Faculty Development

When developing or modifying features in the **Student Workspace**, **Faculty Workspace**, or any other module:

1. **Strict Design Token Adherence**:
   - Always use typography tokens (`var(--type-page-title-size)`, `var(--type-section-heading-size)`, `var(--type-body-size)`, etc.).
   - Never introduce hardcoded font sizes (e.g. `font-size: 28px` or arbitrary `clamp(...)` values) inside component styles.
2. **Color Uniformity**:
   - The primary accent must always resolve to `#003D30`.
   - Never use random shades of green (e.g. `#10B981`, `#2E7D32`, `#16A34A`) for buttons, active tabs, or primary status pills.
   - Use `#EAF2EF` for primary badge backgrounds and `#C2D6CF` for primary badge borders.
3. **Component Reusability**:
   - Use `.page-header` / `.page-title` for all page headers.
   - Use `.stat-card`, `.stat-value`, `.stat-label` for all KPI blocks.
   - Use `.data-table-wrap` and `.data-table` for tabular data.
   - Use `.filter-tabs-bar` and `.tab-btn` for tabbed filters.
   - Use `.status-badge` or `.status-pill` for statuses.
4. **Consistency Enforcement**:
   - Every new page must look like a natural, cohesive extension of the existing LibTrack suite.
   - Always run unit tests (`npm test -- --watch=false`) and production build (`npm run build`) before finalizing any changes.
