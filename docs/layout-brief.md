# Layout brief — Oklch CSS palette generator

Paste this into Claude Design. It is self-contained; no prior conversation is needed.

---

I need layout options for a single-page web tool. Please produce **three or four
meaningfully different layout directions** as artboards — not variations on one idea.
Desktop first, but show how each collapses to mobile. Wireframe fidelity is fine;
what I'm choosing between is arrangement and hierarchy, not visual style.

## What the tool does

It generates a CSS color palette. The user hand-authors a ramp of colors in the Oklch
color space, sees them charted against the limits of human color vision, and copies out
a block of CSS custom properties.

## Vocabulary (please use these words in the design)

- **Palette** — the whole document being edited.
- **Shade** — one rung of a shared lightness ladder, numbered 100, 200, 300… in list
  order. A shade owns a single lightness value.
- **Spectrum** — one named ramp of colors. Every spectrum shares the palette's shades,
  contributing only chroma and hue at each rung. **Today there is exactly one spectrum;
  a future version has several side by side.** Please note in your designs where a
  second and third spectrum would go, without designing that version.
- **Row** — the UI presentation of one shade: three number inputs (lightness %,
  chroma 0–0.5, hue in degrees).

## The six surfaces to arrange

1. **Row list** — one row per shade, each with three number inputs. Rows are
   drag-reorderable (reordering renumbers the shades). Rows can be added and removed.
   Assume 3 rows on first load but design for up to ~15.
2. **Prefix field** — a single text input setting the CSS variable prefix, so output
   reads `--brand-500` rather than `--color-500`.
3. **Cross-section chart** — a square polar chart. Shows a horizontal slice through the
   color space at the *selected row's* lightness: angle is hue, distance from centre is
   chroma, radial axis fixed 0 to 0.5. Contains a filled organic blob (the gamut shape,
   which changes as lightness changes), a thin contour line inside it marking where sRGB
   ends, a thin ring at the selected row's chroma, and a thin line from centre outward at
   the selected row's hue.
4. **Lightness scale** — a horizontal track from 0% to 100% with a neutral black-to-white
   gradient, carrying a draggable marker per shade. Shows the spacing of the ramp at a
   glance. Belongs to the whole palette, not to one row.
5. **Color tiles** — one tile per shade in ramp order, each labelled with its shade
   number and hex value.
6. **CSS output** — a code block of custom properties with a copy button. Some lines
   carry a trailing comment.

## Hard constraints

- **The cross-section is live feedback while typing.** It must remain visible while the
  user edits *any* row, including the last one in a long list. A layout that lets it
  scroll away is wrong.
- **One row is "selected" at a time** and drives the cross-section. Selection persists
  after the input loses focus, so the selected row needs a visible marker of its own —
  it cannot rely on the browser's focus ring. Selection is also reflected in the
  lightness scale (that shade's marker is highlighted).
- **Tiles and CSS output describe the whole palette**, not the selected row. Their
  placement should not imply otherwise.
- The tile strip should show a whole ramp side by side at a readable size — spotting an
  uneven ramp is one of its jobs.
- The lightness scale's markers are **not** necessarily in ascending order; the user is
  allowed to create a ladder where shade 300 is lighter than shade 200. That state gets
  a visible warning somewhere.
- Keyboard and screen-reader users must be able to do everything, including reordering.

## What I want to compare

How each direction answers: where the live chart lives so it never scrolls away; whether
the outputs (tiles, CSS) sit beside the editing surface or below it; whether the
lightness scale reads as a palette-wide control or gets visually captured by the row
list; and how it degrades to a single narrow column.
