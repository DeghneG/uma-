---
name: Uma
description: A Tagalog komiks laid over a pixel-art Visayan farm - speech balloons that point at the speaker, yellow caption boxes, lettered choice panels.
colors:
  ink: "#14110f"
  paper: "#fffdf4"
  caption-yellow: "#ffe97a"
  struggle-pink: "#ffd0c8"
  struggle-ink: "#3b0d07"
  alarm-red: "#e8412f"
  action-blue: "#2d6bd6"
  burst-gold: "#ffd23c"
  disabled-paper: "#d9d3c4"
  disabled-ink: "#5d564b"
  small-text: "#3c342c"
  hud-ground: "#0b130d"
  hud-muted: "#b3c4a8"
typography:
  title:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.02em"
  speech:
    fontFamily: "Pixelify Sans, Courier New, monospace"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "Pixelify Sans, Courier New, monospace"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.42
  choice-title:
    fontFamily: "Pixelify Sans, Courier New, monospace"
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1.15
  numeral:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 1
  action:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  none: "0px"
spacing:
  gap-stack: "18px"
  gap-choices: "26px"
  frame-margin: "40px"
components:
  balloon:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.speech}"
    rounded: "{rounded.none}"
    padding: "15px 26px 17px"
  caption-box:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "15px 24px 17px"
  struggle-box:
    backgroundColor: "{colors.struggle-pink}"
    textColor: "{colors.struggle-ink}"
    typography: "{typography.caption}"
    padding: "15px 24px 17px"
  choice-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.choice-title}"
    padding: "14px 24px 16px 104px"
    height: "116px"
  choice-panel-disabled:
    backgroundColor: "{colors.disabled-paper}"
    textColor: "{colors.disabled-ink}"
  action-burst:
    backgroundColor: "{colors.action-blue}"
    textColor: "#ffffff"
    typography: "{typography.action}"
    padding: "15px 62px 17px 36px"
  action-burst-alt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
---

# Design System: Uma

## Overview

The story UI is a Tagalog komiks laid over the pixel-art diorama. The player reads the game the way they would a pocket komiks: narration in yellow caption boxes, speech in white balloons whose tails point at the character who is speaking, and decisions as lettered panels along the bottom edge. Nothing is a card on a dashboard. The art leads; the UI sits on it like ink on a page, with thick black outlines and a soft drop shadow so it lifts off the scene.

Fixed 1920x1080 frame. The scene is never boxed in by a column: text lives top-left, balloons float near speakers, choices live along the bottom only while a decision is due.

## Colors

Komiks ink and paper: `ink` (#14110f) is every outline and the title stroke; `paper` (#fffdf4) fills balloons and choice panels; `caption-yellow` (#ffe97a) is narration and the title fill; `struggle-pink` (#ffd0c8) with `alarm-red` lettering marks "the struggle"; `action-blue` (#2d6bd6) is the one action burst; `burst-gold` (#ffd23c) fills the numeral starbursts and rating stars. The HUD strip stays dark green-black so it reads over any scene. Ink on paper and ink on yellow both exceed 11:1.

## Typography

Two voices, both lettering rather than UI type. Bangers is the komiks display voice: scene titles (yellow with a 4px ink stroke, rotated -1.5 degrees), choice numerals, the action burst, panel-number label, status chips. Pixelify Sans is the speech and reading voice for balloons, captions and choice text, so the lettering stays native to the pixel art. Never use a system sans for in-game text.

## Layout

Top-left: panel-number label (scene name), then title, then the caption box stack (narration, hint, counters, "the struggle"), 940px wide. Balloons are positioned above their speaker, tail pointing down at the head; an off-screen speaker speaks from the top-right sky with the tail pointing off the right edge. Bottom: one row of equal choice panels (or the action burst, or the harvest timing bar), 40px from the frame edges. Results and summary use a centered paper sheet.

## Elevation & Depth

Outlines are 4px ink drawn as zero-blur spread shadows on four sides, which notches the corners like a pixel border. Lift comes from a soft `drop-shadow(0 8px 10px rgba(0,0,0,.3))` under every caption, balloon and panel. Hover raises a choice panel 9px and tilts it 0.7 degrees.

## Shapes

No border radius anywhere: boxes are pixel-notched rectangles. Balloon tails are stepped pixel triangles drawn as SVG. Numerals sit in a drawn eight-point starburst. Rating stars are drawn five-point SVG stars.

## Components

- **Balloon:** paper, ink outline, speaker name tab in ink with yellow Bangers lettering above the top-left corner, stepped tail.
- **Caption box:** yellow, a faint halftone dot corner, used for narration, hints and feedback; the pink variant is "the struggle" with a red Bangers run-in label.
- **Choice panel:** paper, starburst numeral at left, bold title and a smaller description; a small ink chip (Help/Explore) in the top-right corner. Disabled: opaque grey, numeral greyed.
- **Action burst:** blue, white Bangers text, triangle at the right, rotated -1 degree; the "Play again" variant is paper with ink text.
- **Status chips:** ink pills with yellow Bangers text.

## Do's and Don'ts

- Do let a balloon's tail point at the speaker; do move an off-screen voice to the sky at the top right.
- Do keep narration short enough to read in one glance; split long text rather than shrinking it.
- Don't add a side column, a modal, or a rounded web card. Don't put a small label above a heading (the panel-number label already names the scene).
- Don't use a thick colored border on one side of a box, or hard offset block shadows; outlines are ink on all four sides.
- Don't use system fonts or emoji for in-game text or icons; draw icons as SVG.
