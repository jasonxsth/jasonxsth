# RENDART design QA

## Visual truth and normalized evidence

- Source visual truth: `output/playwright/v1-home-source.png`
- Rendered implementation: `output/playwright/final-home-hero.png`
- Combined comparison input: `output/playwright/final-design-qa-comparison.png`
- Route and state: homepage, initial hero, first session
- Viewport: 1440 × 1000 CSS px, device scale factor 1
- Source pixels: 1440 × 1000
- Implementation pixels: 1440 × 1000
- Comparison normalization: both captures use the same viewport and density; the combined image shows matching 720 × 500 half-scale crops without browser chrome

## Findings

No actionable P0, P1 or P2 differences remain.

- Typography: the approved split REND/ART construction, weight contrast and center seam remain. Commissioner is limited to the identity; Geologica and Literata carry the rest of the interface. The unreadable vertical label and ambiguous `RnD / Art` microcopy were removed as required by the later Google feedback
- Spacing and layout: the 50/50 material axis, centered wordmark, low navigation and baseline are preserved. The final hero has less decorative noise and keeps all functional navigation clear
- Color: paper, charcoal, deep teal and amber remain the core palette. Contrast was measured by Lighthouse and passes accessibility auditing
- Imagery: the same approved RENDART material-axis asset is used at its intended crop and quality. No placeholder, stock, CSS drawing or substitute asset is present
- Copy: menu labels now match the new information architecture: brands, designers, portfolio and RENDART. `МОСКВА / УДАЛЁННО` and the ambiguous micro-labels are absent

The intentional differences from the source are direct requirements from the new brief and later edits, not design drift

## Focused-region evidence

The full-view comparison is also a focused hero comparison because the source truth concerns one first-screen composition. Important details are legible at the normalized scale: identity typography, seam alignment, menu labels, CTA and baseline. Separate crops were unnecessary

## Comparison history

- Earlier P2: the legacy hero included an unreadable micro-label, `RnD / Art` looked like a language switch, and its menu used the obsolete `Услуги / Подход` architecture
- Fix: removed the two ambiguous micro-labels and changed navigation to the requested audience-first structure while retaining the approved visual composition
- Post-fix evidence: `output/playwright/final-design-qa-comparison.png`

## Browser and interaction verification

- 16 public production routes checked at 1440 × 1000: HTTP 200, exactly one H1, no horizontal overflow, no broken images, no duplicate IDs, no empty links, no console errors
- Seven representative routes checked at 390 × 844 with no overflow or console errors
- Mobile overlay menu opens to the full viewport and closes with Escape
- Audience query preselects the matching form route
- Missing CRM integration produces an explicit message and never fakes success or redirects
- Admin loads schema v2 with 17 navigation entities and no console errors
- Lighthouse mobile: Performance 93, Accessibility 100, SEO 100

final result: passed
