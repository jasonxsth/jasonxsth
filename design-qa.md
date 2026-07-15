# RENDART design QA

## Evidence

- Source visual truth, approved desktop hero: `output/playwright/rendart-home-hero-desktop-v3.png`
- Source visual truth, approved mobile hero: `output/playwright/rendart-home-hero-mobile-v3.png`
- Source motion/frame reference: `/var/folders/ms/y40jbw5x4v77lyz8bgc7c9gc0000gn/T/codex-clipboard-aa22df49-3d64-4641-b69b-fd28a37bf9d0.png`
- Implementation URL: `http://127.0.0.1:4173/`
- Desktop implementation: `output/playwright/v2-home-hero.png`, viewport 1440 × 1000, initial state
- Mobile implementation: `output/playwright/v2-mobile-hero-390x844.png`, viewport 390 × 844, initial state
- Scroll-frame implementation: `output/playwright/v2-home-aperture.png`, viewport 1440 × 1000, aperture timeline at about 55%
- Full comparison evidence: `output/playwright/qa-hero-comparison.png`
- Mobile comparison evidence: `output/playwright/qa-mobile-hero-comparison.png`
- Focused motion/frame comparison: `output/playwright/qa-aperture-comparison.png`

The Ragged Edge screenshot is a behavior and composition reference rather than a pixel-identical content state. The comparison therefore evaluates whitespace, media framing, hierarchy and the transition from full-bleed media to an editorial frame, without claiming pixel parity.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the approved Commissioner and Literata split remains intact on the hero. Geologica Variable replaces the earlier heavy display face after the hero at low weight and moderate `SHRP`; this makes screens two and three visibly lighter. Line height and wrapping hold at 1440 px and 390 px.
- Spacing and layout rhythm: hero geometry is preserved. The next screen uses deliberate whitespace with a smaller title and a short reading column. Later sections alternate editorial grids, lists and full-height studies instead of repeating card patterns.
- Colors and tokens: paper, graphite, teal, amber and dark green map to the PDF palette. Contrast is sufficient in the inspected states. Focus uses amber against light and dark surfaces.
- Image quality and fidelity: every visible project image is a real RENDART portfolio asset. No CSS illustration, inline SVG, emoji or image placeholder is used. Crops are art-directed per section and no image failed after eager-load verification.
- Copy and content: service claims are grounded in the supplied PDFs and portfolio. Prices, awards, unsupported performance statistics and invented client outcomes are not published. The contact email is verified on page 13 of `RENDART.pdf`.
- Icons and controls: the interface uses only typographic arrows and a two-line menu control; alignment and hover/focus states were inspected. No external icon set is needed for the current scope.
- Responsiveness and accessibility: no horizontal overflow was found on any of six routes. Each route has one H1, semantic navigation, labelled form controls, alt text, focus treatment and a reduced-motion fallback. Smooth scroll and scrubbed media are desktop fine-pointer enhancements only.

## Comparison history

### Iteration 1

- Earlier P2: the mobile menu was constrained by the transformed fixed header and displayed only its last items.
- Fix: the mobile navigation now has explicit `100vw × 100svh` geometry; the logo and close control stay above the panel. Header auto-hide was limited to desktop.
- Post-fix evidence: `output/playwright/v2-mobile-menu-fixed.png`. All five navigation targets are visible and Escape closes the menu.

### Iteration 2

- Earlier P2: lazy images were initially reported as unloaded by a viewport-only diagnostic.
- Fix: no code change was necessary. The verification was repeated after forcing eager load and scrolling each route to the end.
- Post-fix evidence: zero broken images across `/`, `/about/`, `/services/`, `/portfolio/` and `/b2b/`.

## Primary interactions tested

- Desktop and mobile navigation rendering
- Mobile menu open and Escape close
- Lenis smooth wheel integration on a fine pointer
- GSAP aperture frame at mid-scroll
- Responsive static aperture fallback
- Header theme changes and desktop hide/reveal behavior
- Contact form required-field validity and verified `mailto:ir@rendart.ru` target
- All six routes, titles, H1 counts, image loads and horizontal overflow
- Browser console on homepage and all inner-page hero captures: zero errors and zero warnings

## Follow-up polish

- P3: the hero navigation changes the earlier label `Команда` to `Возможности`. This is intentional because the PDFs support capabilities more strongly than a public team roster.
- P3: the DOM aperture uses transform and clip-path rather than the reference site's Three.js UV deformation. This is an intentional performance tradeoff and preserves the perceptual idea the user asked for.

## Implementation checklist

- [x] Approved hero preserved
- [x] Lighter second screen and shorter reading column
- [x] Third screen converted into a clear project study
- [x] Real portfolio imagery throughout
- [x] Desktop motion with mobile and reduced-motion fallback
- [x] Inner pages and contact path implemented
- [x] Browser and build checks passed

final result: passed
