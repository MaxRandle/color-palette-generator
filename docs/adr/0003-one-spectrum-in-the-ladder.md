# The ladder edits one Spectrum at a time; the Tiles show them all

A Spectrum contributes a Chroma and a Hue at every Row, so each one it gains adds two
number fields to every line of the ladder. Rather than widen the ladder, it shows the
Active Spectrum alone, chosen from a tab strip. The job of showing every Spectrum together
moves to the Tiles, which become a grid: a column per Spectrum, a row per Socket.

## Considered Options

- **A Chroma/Hue column pair per Spectrum, side by side** — rejected: at five Spectrums the
  row carries eleven flexible columns beside a Cross-section that already takes up to 36rem,
  and the fields stop being editable well before they stop fitting. This was the arrangement
  the editor was originally written to expect.
- **A full ladder per Spectrum, stacked** — rejected: repeating the Lightness column per
  Spectrum reads as though each ladder owns its own Lightness, which is exactly the drift
  ADR-0001 exists to forbid.

## Consequences

ADR-0001's guarantee — equal Socket number means equal perceived Lightness across every
Spectrum — is no longer visible in the surface where the Palette is authored. The Tiles
grid is what makes it visible instead, so the grid is load-bearing rather than decorative:
a Socket's Tiles must stay aligned across every column, and a Tile must stay wide enough to
carry its two specimens, scrolling the grid rather than shrinking past that.

Because a wrong color is now noticed in the grid rather than in the ladder, every Tile is a
control: it makes its Spectrum Active and selects its Row. That buys a focusable control per
Socket per Spectrum on a page already dense with them, which is the price of splitting
authoring and comparison across two surfaces.

The Cross-section follows the Active Spectrum alone. Drawing every Spectrum's ring and line
on the one slice was considered, since a single slice already serves them all — one Lightness
governs every Spectrum — but the chart is live feedback for the Row being typed into, and
five rings answer a different question than the one it is being watched for.
