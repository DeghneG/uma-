# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Vite + TypeScript, HTML Canvas scene (640x360 pixel grid shown at 3x inside a fixed 1920x1080 frame), GSAP for motion, procedural WebAudio. Existing codebase: no stack decision pending.

## Users
Teenagers (the stated audience), playing in a desktop browser with keyboard and mouse; mobile taps are a later concern. The game is bilingual (English and Filipino, toggled in game). It is also a personal portfolio piece.

## Product Purpose
"Uma" is a web game that raises awareness of what tenant farmers in the Visayas, Philippines face. A tenant family of rice, sugarcane, livestock and coconut/vegetable farmers is given five months and no payment before the wealthy Sevilla family clears the paddy for a factory. They have P4,000 and need P20,000 to start over in the city, so the player plants, harvests and sells each crop at market. Success is the player understanding the pressure of tenancy, low farm-gate prices and climate, ending on an open, reflective note about staying or leaving.

## Positioning
A story told from inside one family's land, where every farming decision spends real pesos against a deadline set by someone else, with a bahay kubo, carabao and rice terraces as the setting instead of a generic farm.

## Operating Context
Month 1 (rice) is built: a title screen, intro captions, a prologue, four weekly decision scenes (field prep order, pest fixes, dry-spell choice, harvest timing game), a market sale and an itemized summary. Months 2-5 and a free-roam Explore mode are planned. The savings goal bar (P4,000 / P20,000), morale and months left are always visible in story mode only.

## Capabilities and Constraints
- Fixed 1920x1080 frame scaled to the window; pixel art drawn in code plus hand-drawn character sprites in `public/sprites` (Tatay Bert, Nanay Flor, the kid); source art in `Characters/`.
- All text is bilingual (EN/FIL), and the Filipino text still needs a native-speaker review.
- Keyboard: number keys pick choices, Space cuts rice, Backspace goes back. Sound has an on/off toggle. Reduced motion is respected.
- Names are placeholders where noted: the landowners are "Sevilla"; Mang Ben is a neighbor.

## Brand Commitments
Title "Uma". Characters Tatay Bert, Nanay Flor, Mang Ben and the kid. The hand-drawn character sprites are binding art. Pixel-art look.

## Evidence on Hand
Hand-drawn SVG/PNG character sprites (`Characters/`, `public/sprites/`). No real testimonials, statistics or case data have been supplied; the game must not fabricate real-world statistics.

## Product Principles
1. The player is inside the family's situation, not reading about it.
2. Every choice has a visible peso consequence.
3. The world (land, animals, factory on the horizon) carries the story as much as text does.
4. Respect the player's attention: short beats, no walls of text.

## Accessibility & Inclusion
Bilingual EN/FIL. Honor prefers-reduced-motion. Keyboard-playable.
