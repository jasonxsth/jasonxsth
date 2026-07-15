# RENDART design QA

## Scope and visual evidence

- Implementation: `http://127.0.0.1:4173/`
- User source, collage issue: `/var/folders/ms/y40jbw5x4v77lyz8bgc7c9gc0000gn/T/codex-clipboard-fb0d5bb3-3f16-4193-9207-8e1dc239a386.png`
- User source, unclear case copy: `/var/folders/ms/y40jbw5x4v77lyz8bgc7c9gc0000gn/T/codex-clipboard-e893c4aa-ee6d-40b0-b585-e51fec9ed76c.png`
- User source, oversized services and weak hover: `/var/folders/ms/y40jbw5x4v77lyz8bgc7c9gc0000gn/T/codex-clipboard-3d5b2684-a29e-4a49-8dd0-68cf44afc3c5.png`
- Combined collage comparison: `output/playwright/qa-collage-before-after.png`
- Combined case comparison: `output/playwright/qa-case-before-after.png`
- Combined services comparison: `output/playwright/qa-services-before-after.png`
- Desktop captures: `output/playwright/revision-position.png`, `revision-layers-clean.png`, `revision-aperture-final.png`, `revision-capabilities-hover-final.png`
- Mobile captures at 390 × 844: `revision-mobile-position.png`, `revision-mobile-layers.png`, `revision-mobile-aperture.png`, `revision-mobile-capabilities.png`

The three combined images put the supplied screenshots and revised implementation into the same comparison input. The source screenshots include browser chrome, so their page content was cropped and normalized to the same 1920 × 1080 content viewport before comparison.

## Findings after comparison

No actionable P0, P1 or P2 issues remain.

- Positioning clarity: the second screen now states the product, audience and use cases directly: 3D visualization, drawings, specifications, approvals, construction, production and marketing.
- Collage replacement: the rotated overlapping stack is gone. A sticky editorial sequence presents one dominant material at a time and explains what collage, 3D and working drawings do. Scroll progress reveals the next material from the bottom into a controlled rectangle.
- Case clarity: the former poetic heading was replaced by a client task, concrete deliverables and a clear next action. The display size was reduced and holds a calmer four-line measure at desktop.
- Services hierarchy: the section heading is substantially smaller, the four rows name concrete deliverables and the unproven digital service was removed from the homepage.
- Hover and focus: each desktop row now has a full teal fill, light text, an explicit detail label and a synchronized real project preview. Keyboard focus triggers the same preview change. Mobile receives a stable stacked list without relying on hover.
- Copy discipline: all terminal periods were removed from visible phrases and paragraphs across all six routes. Menu language was changed from `Возможности` to `Услуги`.
- Evidence discipline: prices, awards, unsupported statistics, invented client outcomes and unverified promises remain unpublished.
- Assets: all visible imagery comes from the supplied or public RENDART portfolio. No placeholder imagery, CSS art, inline SVG or generated substitute is used.
- Responsive behavior: no horizontal overflow was found at 1920 × 1080, 1440 × 1000 or 390 × 844. The sticky sequences fall back to readable static layouts on touch-sized screens and under reduced motion.

## Functional and technical checks

- Source validation and production build: passed
- Six routes: one H1 each
- Six routes: zero broken loaded images
- Six routes: zero horizontal overflow at 1440 × 1000
- Desktop homepage console: zero errors and zero warnings
- Mobile homepage console: zero errors and zero warnings
- Capability hover changes active preview from `visual` to `design`
- Smooth scroll and GSAP sequences run only on desktop fine pointers
- Reduced-motion fallback disables scrubbed transitions

## Residual P3 notes

- The scroll sequence uses CSS clip-path and transforms instead of a WebGL deformation. This keeps the requested framing behavior while avoiding a heavier rendering dependency.
- The first sequence image is a real RENDART concept sheet that includes both visual and technical annotations. It is presented as an example of the service composition, not as a claimed single client case.

final result: passed
