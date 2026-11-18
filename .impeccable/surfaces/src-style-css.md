---
version: 1
slug: "src-style-css"
primary_target: "src/style.css"
related_targets: ["src/ui.ts","index.html"]
---

# Surface brief: in-game story UI

Scope and visitor mode: Experience. The player is inside the game; the pixel diorama leads and the interface recedes. Covers the story overlay (narration, speech, choices, results), the HUD strip, and the back button. Title menu and intro captions already follow the pixel language and stay.

Audience, job, content: Filipino teenagers on a desktop browser, bilingual EN/FIL. They follow a tenant family's five months, hear Tatay Bert, Mang Ben and the others speak, and make peso-costing choices. All existing copy, choices, keyboard (1-9, Space, Backspace) and game logic stay untouched. The user rejected the old right-hand web card ("looks like a website") and chose speech bubbles on the scene with a small choice menu only when a decision is due.

Unresolved: Filipino lettering needs a native-speaker check; hand-drawn balloon art could replace the CSS-drawn tails later.

## Direction contract

THESIS: The UI is a Tagalog komiks laid over the pixel diorama. The story is told by speech balloons whose tails point at the speaking character and by yellow caption boxes, not by a panel; it refuses the side-column dashboard card.

OWN-WORLD: Komiks-paper white balloons with thick black ink outlines and pixel-notched corners, pale-yellow caption boxes with halftone dot shading, signal red for costs and "the struggle", cobalt for the action burst, ink black #14110f. Lettering is Pixelify Sans for speech and Bangers for titles, numerals and the savings figure. Choices are lettered panels with yellow star-burst numerals and a red peso tag. Tails are stepped pixel triangles.

STORY: The player reads short narration captions, hears characters in balloons that point at them, and picks from lettered panels that state their peso cost; the factory and land stay visible the whole time.

FIRST VIEWPORT: Prologue. The scene runs unobstructed full width. A yellow caption box top-left carries the title in Bangers lettering and the narration; no right column. Two lettered choice panels (Help, Explore) sit along the bottom with star-burst numerals 1 and 2. Back button top-left above the caption.

FORM: Tagalog komiks (IMPECCABLE'S PICK, kind pick, position 1 of 7 on my grounded list), seed:065bcc3c111fb86e.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
