# Lightness belongs to the row, not the spectrum

A palette is a ladder of rows sitting in numbered sockets. A row owns one lightness value
and spans every spectrum, with each spectrum contributing only chroma and hue at that row.
A spectrum cannot hold its own lightness. This makes a shade number denote an equivalent
perceived lightness across every hue and every spectrum, which is what lets the palette be reasoned about for
accessibility and visual weight rather than merely looking coordinated.

## Considered Options

- **Shared by default, unlockable per spectrum** — rejected: the moment lightness can
  drift, a shade number stops denoting a visual weight and the guarantee is gone. Easy
  to add later if the constraint genuinely bites; impossible to add the guarantee back.
- **Independent per spectrum, aligned by convention** — rejected: no guarantee at all.

## Consequences

Different hues have very different chroma available at a fixed lightness — yellow runs
out of room at low lightness, blue at high. The pressure will be to nudge one row's
lightness for one spectrum. Chroma is the intended escape hatch instead, which is what
the cross-section chart exists to make visible.

Equal Oklch lightness is *perceptual* equivalence. It is not equal WCAG 2.x contrast,
which is computed from relative luminance and is not a perceptually uniform measure.
Two stops at the same shade will look equally heavy but can compute to different WCAG
ratios against the same background.

Dragging moves a whole row — its lightness together with every spectrum's stop — between
sockets, taking the destination socket's number. It is never possible to drag a single
spectrum's cell independently, because that is precisely what would break the guarantee.
