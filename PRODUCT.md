# Product

## Register

product

## Users

Two friends, partners, or family members planning a road trip together. They've already decided to make the trip; what they want help with is the *middle of the route* — the surprises, the worth-stopping-for places, the things they'd both enjoy. Used in two contexts: at home on a laptop while planning, and on a phone the day-of from the passenger seat. v1 is a tiny known group, not a public launch.

## Product Purpose

Detour pairs two people for a single road trip and surfaces the places along their route that satisfy interests both of them care about. Success looks like: a couple invites each other, fills in interests once, and gets a short, trustable list of stops bucketed by how far off-route they are — then opens one in Apple/Google Maps and goes. The product disappears at the moment of the trip.

## Brand Personality

Calm, precise, warm. Three words: **considered, hospitable, quiet**. Voice is plain language with a light editorial touch — never breezy or salesy, never airline-loyalty-program. The interface should feel like a knowledgeable friend who's already made a shortlist, not like a recommendation algorithm shouting suggestions.

## Anti-references

- The "travel-app cliché" lane: orange-to-teal gradients, stock photos of people pointing at maps, oversized rounded cards with drop shadows, vacation-emoji-laden empty states.
- The "generic SaaS dashboard" lane: purple gradients, hero-metric tiles, dense data viz where none is needed.
- Algorithmic-feed UX: infinite scrolls of indistinguishable places, "Top picks for you" carousels, recommendation badges shouting at the user.
- Skeuomorphic travel motifs: postcard borders, passport stamps, paper-map textures, retro road-sign typography. Tasteful in a print piece, kitsch on a web app.

## Design Principles

1. **The interface gets out of the way before the trip starts.** Most of the user's time is spent away from the app — driving. Every screen should feel like it's preparing them to leave, not asking them to stay.
2. **Trust over volume.** A short, well-reasoned list beats an exhaustive one. When the matching algorithm can show *why* a place is here ("editorial reasoning", shared interests), surface that — but never as a marketing badge.
3. **Two people, equally seen.** Wherever shared state appears (matched interests, paired status), both people are represented with equal weight. Never "you and them" framing where one person is the protagonist.
4. **Plain language, considered typography.** No clever taglines, no jargon, no unearned exclamation. The work of the design is in spacing, weight, and rhythm — not decoration.
5. **Calm color, deliberate accent.** The interface lives mostly in tinted neutrals; color appears with intent (a primary action, a route line on a map, a state) and never as ambient mood.

## Accessibility & Inclusion

- Target WCAG 2.2 AA: contrast ratios met for body text, controls, and focus indicators in both light and dark themes.
- Respect `prefers-reduced-motion`: animations and transitions degrade to instant or short fades; never block task completion.
- Touch targets ≥ 44×44px on mobile (the day-of-trip context is one-handed in a moving car).
- Color must not be the sole carrier of meaning — bucketed match groups, paired-status states, and interest categories are also distinguished by typography or label.
- Map markers are distinguishable to users with red/green color blindness (don't rely on red-vs-green for origin/destination contrast).
