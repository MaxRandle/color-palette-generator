# The visible gamut boundary is a precomputed binary table behind a maxChroma() seam

The cross-section's shape comes from the Rösch–MacAdam optimal color solid, which is
expensive to derive and never changes. A TypeScript generator computes it once from
vendored CIE color-matching-function and D65 data (taken from colour-science, BSD-3-Clause,
since CIE asserts no licence on its tables), emitting a `Uint16Array` of maximum chroma
sampled at 1 degree of hue by 0.5% lightness, with the L=0% and L=100% rows anchored to
exactly zero. At runtime a single function, `maxChroma(lightness, hue)`, bilinearly
interpolates that table; nothing else in the app knows what the gamut is or how it was
derived.

## Considered Options

- **Compute in the browser on first load** — rejected: seconds of work, repeated for every
  visitor, to recompute a constant.
- **A Python generator** (the research prototype's language) — rejected: a second toolchain
  is a permanent tax on CI and contributors for a script that runs a handful of times. The
  prototype's numbers are retained as a cross-check for the ported implementation.
- **JSON rather than binary** — rejected: at 72,000 entries the readability is theoretical
  and diffs are noise, while binary parses for free.

## Consequences

0.5% lightness sampling matches the resolution the lightness-scale drag snaps to, so dragged
values need no interpolation at all. It was chosen over 1% because the boundary collapses
steeply near white (chroma 0.30 at L=90%, 0.13 at L=99%, 0 at L=100%) where linear
interpolation over 1% steps is off by enough to visibly cut the corner; error falls with the
square of the step size.

The seam is what makes the shape improvable. A cruder or finer boundary, a different
illuminant or observer, or an added device-gamut overlay are all changes behind
`maxChroma()` with no effect on the chart.

Display P3 and Rec.2020 both contain coordinates outside the optimal color solid, so
`maxChroma()` reports some displayable colors as out of gamut. This is correct — those are
colors no physical surface can produce — but it means device gamuts are not subsets of this
boundary and must be drawn as their own curves.
