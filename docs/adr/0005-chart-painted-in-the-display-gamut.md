# The Cross-section and the wheel are painted in the screen's gamut, not in sRGB

The Cross-section's field and the Hue wheel's rim have their Chroma pulled in to the
Display gamut, which is Display P3 on a screen that reports one and sRGB otherwise. The
pulling in is the same Chroma reduction the Fallback uses, against a different Boundary:
never RGB clipping, at either gamut. The screen is read once from
`(color-gamut: p3)` and both layers follow it, the vector layer through `oklch()` and the
raster layer through a `display-p3` canvas painted from a second Oklab matrix.

Nothing about the Palette moves. Authored values, the Fallback, the sRGB region's contour
and the exported hex are all still sRGB-bound, because the output is hex.

## Considered Options

- **Hand the browser an out-of-gamut `oklch()` and let it map** — rejected: what a browser
  does with a color its display cannot show is not specified consistently, and clipping
  shifts the Hue, which would make the angular axis lie. This is the bug the wheel already
  had once. Pulling in first means the browser is only ever handed colors it can show
  outright.
- **Always paint in Display P3 and let the compositor convert down** — rejected: on an sRGB
  screen the conversion is a clip, which is the same Hue shift arriving by another route.
- **Draw a P3 contour as a third curve, leaving the field in sRGB** — rejected: it answers
  a question nobody asked. The user is judging colors by eye; the value is in seeing the
  Chroma, not in being told where a gamut they cannot see would have ended.

## Consequences

The chart now shows Chroma that cannot be exported, which is the point but is also a way
to be misled. The sRGB region's contour is what keeps it honest, and it earns its place
properly for the first time: on an sRGB screen it fell on the edge of the field's flat
region and said little, and on a wide screen it is visibly inside it.

Two screens show the same Palette differently, and a screenshot of the chart is an sRGB
image of a P3 field. Neither affects what the tool emits.

The Oklab-to-linear-P3 matrix is a second copy of a conversion, tested against `culori`
exactly as the sRGB one is, so the two cannot drift apart.

Per ADR-0002 the Visible gamut still bounds the field's shape, and Display P3 holds
coordinates outside it. Where it does, the pull to the Display gamut is inert and the
field simply ends at the Visible Boundary.
