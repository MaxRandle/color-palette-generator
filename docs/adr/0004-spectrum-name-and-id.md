# A Spectrum's name is a CSS identifier; its id is separate and never changes

A Spectrum's name is part of every custom property it emits, so it is validated as a CSS
identifier and refused if another Spectrum already holds it, exactly as the Palette's prefix
is. A Spectrum's id is a separate value, minted when the Spectrum is created and never
shown: it is what a Row's Stops are held against, so renaming is a one-field edit that
touches no authored color.

## Considered Options

- **Free text as the name, slugified on export** — rejected: `My Brand` and `my-brand` slug
  to one property and one silently overwrites the other, and the name on screen stops
  matching the name in the CSS. A Palette code carrying such a name would decode cleanly and
  then emit a broken block, which is precisely what the decoder's strictness exists to
  prevent.
- **The name *is* the id**, as the starter Palette's identical pair suggests — rejected: a
  rename would have to rewrite every Row's Stops, and any Palette code already shared would
  decode to Rows referencing an id no Spectrum has.
- **A UUID as the id** — rejected: ids need only be unique within one Palette, which is
  cheap to check, and every id is spelled out in the Palette code. A long ladder times
  several Spectrums is where the URL fragment gets long, and the Rows are the part worth
  spending it on.

## Consequences

The user cannot name a Spectrum "warm grey" or "brand/primary". This is a real restriction
that the field has to explain, and the reason is not visible from the UI: the name is a
fragment of a property name, not a caption.

Because ids are short and drawn from a small pool, two Palettes will routinely use the same
ids for different Spectrums. Ids are meaningful only within the Palette that holds them, and
nothing may treat one as a stable reference across Palettes.
