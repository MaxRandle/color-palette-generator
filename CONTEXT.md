# Color Palette Generator

A browser tool for building a CSS color palette by hand in Oklch, with charts that show
where each color sits in the color space, and a copy-pasteable CSS output.

## Language

**Oklch**:
The color space every color in this tool is authored in, expressed as Lightness, Chroma
and Hue. It is the *only* authoring space: values the user types are always Oklch values.
_Avoid_: LCh, CIELAB, Lab (CIELAB is a different space with a different chroma range and
hue offset — never use it as a synonym for Oklch)

**Lightness**:
The first Oklch component, entered as a percentage from 0% to 100%.
_Avoid_: Luminance, brightness, value

**Chroma**:
The second Oklch component, a unitless value from 0 to 0.5. Distance from the neutral
axis — how saturated the color is. The 0.5 ceiling is the authoring bound, matching the
Cross-section's radial axis; it sits outside the sRGB region at every Hue, so values near
it are legal to author and fall back on export.
_Avoid_: Saturation, intensity

**Hue**:
The third Oklch component, an angle in degrees from 0 to 360.

**Cross-section**:
The chart showing a horizontal slice through the Oklch color space at one Lightness,
drawn in polar coordinates: angle is Hue, distance from the origin is Chroma.
_Avoid_: CIELAB cross-section, Lab slice

## Gamut

**Visible gamut**:
The set of colors a human can actually perceive, independent of any display hardware.
The cross-section's outer boundary. Oklch can express coordinates outside it.
_Avoid_: Human gamut, full gamut, all colors

**Boundary**:
The outer edge of a gamut at one Lightness, expressed as the maximum Chroma available
at each Hue. What gives the cross-section its shape.
_Avoid_: Envelope, limit, edge

**sRGB region**:
The area of the cross-section that maps to a hex value. Colors outside it cannot be
exported and must fall back.

**Optimal color solid**:
The Rösch–MacAdam limits — the set of colors producible by a physical surface under a
reference illuminant. This project's definition of the Visible gamut.
_Avoid_: MacAdam limits, object color solid

**Fallback**:
The color obtained by reducing a Stop's Chroma, holding Lightness and Hue fixed, until it
lands inside the sRGB region. Always *derived* for rendering and export: the authored
Oklch values are the source of truth and are never overwritten by their Fallback. The
target is sRGB because the output is hex, not because of the user's display.
_Avoid_: Clipping, clamping (RGB clipping shifts Hue and is never what this project means)

## Palette structure

**Palette**:
The whole document the user is building: a naming prefix, an ordered ladder of Rows
sitting in numbered Sockets, and one or more Spectrums.

**Socket**:
A numbered position in the palette's ladder. Its number counts up in multiples of 100 from
its index, so it is a property of position, not of what occupies it. A Socket owns nothing
but its number.
_Avoid_: Slot, position

**Row**:
The unit that occupies a Socket: one Lightness, plus one Stop per Spectrum. Rows are what
the user drags; a Row moving to another Socket takes that Socket's number. Because a Row
spans every Spectrum, dragging one rearranges all Spectrums together and the shared ladder
survives. Equal Socket number means equal perceived Lightness across every Spectrum.
_Avoid_: Shade, step, rung, level, tone (a "shade number" is the Socket's number)

**Spectrum**:
One named ramp of colors across every Socket. Contributes only Chroma and Hue — never
Lightness. v1 has exactly one.
_Avoid_: Ramp, scale, palette (a Palette contains Spectrums)

**Lightness scale**:
The single upright track beside the ladder carrying one marker per Row at its Lightness,
running 100% at the top down to 0% at the bottom, the way the ladder runs. It belongs to
the whole Palette, so its track is neutral rather than tinted with any Spectrum's colors,
and it carries no labels: the numbers are in the ladder and the scale's job is spacing.
A drag snaps to 0.5%; typing does not.
_Avoid_: Lightness slider, ramp bar (and note "scale" alone still never means a Spectrum)

**Turning back**:
What a ladder does when some step in it runs against the direction it started in, which
is what makes it non-monotonic in Lightness. Reported to the user as one warning about
the ladder, never per pair and never prevented: clamping the drag would stop it with no
explanation and re-sorting would rearrange the ladder mid-drag, and both override an
explicit action.
_Avoid_: Inversion, reversal, out-of-order row

**Palette code**:
The whole Palette written as one versioned string, carried in the URL fragment and in
localStorage. It stores authored Oklch values, never their Fallbacks, so a shared Palette
is not permanently flattened to sRGB. The fragment rather than a query string, so the
Palette never reaches a server.
_Avoid_: Serialized palette, palette hash (the fragment is not a hash of anything)
