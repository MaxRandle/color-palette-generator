# Chroma belongs to a shared profile, not to a spectrum

A palette holds one or more named chroma profiles, each a chroma value per row. A spectrum
names the profile it reads and contributes nothing but hue. Equal shade number therefore
means equal chroma as well as equal lightness across every spectrum reading the same
profile, which is what lets several spectrums be authored in one go — a brand primary and
a brand secondary — without one coming out more vibrant than the other. Several profiles
exist so that a palette can hold vibrant colors, subtle accents and a neutral grayscale at
once, with each spectrum choosing which it belongs to.

This extends ADR-0001 along the second oklch axis, and pays a price that ADR-0001
explicitly banked on. See Consequences.

## Considered Options

- **Profile as a default, overridable per stop** — rejected for the same reason ADR-0001
  rejected unlockable lightness: the moment one spectrum can break out, a shade number
  stops denoting a chroma and the guarantee is gone. An escape hatch used once anywhere
  invalidates the claim everywhere.
- **Profile as a ceiling, each stop taking whatever its hue can reach** — rejected. It is
  the override above, applied silently and with no way to see it. The palette would always
  look reachable and the shared-chroma claim would quietly be false exactly where it
  mattered.
- **Refusing to author a chroma no spectrum's hue can reach** — rejected: one awkward hue
  would cap the vibrancy of the entire palette at every shade.
- **A fixed set of three built-in profiles** — rejected. Every other axis of this tool is
  hand-authored, and "vibrant" is not a universal quantity. The three ship in the starter
  palette as ordinary, editable profiles instead.

## Consequences

ADR-0001 sold the shared lightness ladder on the grounds that chroma was the escape hatch:
"yellow runs out of room at low lightness, blue at high — chroma is the intended escape
hatch instead". That hatch is now closed. A spectrum owns only its hue, and a row at a
fixed lightness has no free axis left. The remedy for a stuck hue is to move that spectrum
onto a different profile, or to retune the profile for every spectrum on it.

An unreachable chroma is authored anyway and reaches the screen and the CSS through the
existing fallback, so a palette is never blocked and authored values are never overwritten:
widening a profile later restores the original intent rather than finding it lost.

Nothing warns when that happens. This is a knowing blind spot: the cross-section draws only
the active spectrum, so before this change going out of gamut was a deliberate act on one
stop while looking at the chart, and after it a spectrum the user is not looking at can be
pushed out of gamut by a number typed for a different one. If it bites, one warning about
the profile — the shape "turning back" already uses — is the intended remedy.

The ladder's chroma column edits a shared value, so typing in it while looking at one
spectrum changes others. The column is headed with the profile's name so the reach of the
edit is stated rather than inferred. The lightness column beside it has always behaved this
way; making the two adjacent columns differ would be the more confusing outcome.

A chroma value lives on the row, one per profile, rather than on the socket. Chroma
therefore travels with a row when it is dragged, exactly as lightness does, and adding or
removing a row cannot desynchronise a profile's length from the ladder's.

Removing a profile is never a local edit: every Spectrum reading it changes color
at once, from wherever the user happens to be standing, and the values it held are
not recoverable from what is left behind. It is therefore refused outright while
more than one Spectrum reads it, rather than removing and reassigning the readers
— the control says how many are using it instead of disappearing. The last profile
cannot go either, since every Spectrum needs one to read. Removing a profile only
one Spectrum reads moves that Spectrum to the first profile left, which is a
visible change to the Spectrum in hand rather than to one out of sight.

Choosing which profile a Spectrum reads and choosing which profile to edit are one
control, because they are one act: the ladder shows the Active Spectrum's profile,
so a profile is looked at by being assigned. The cost is that a profile no Spectrum
reads can only be reached by assigning it to one, which recolors that Spectrum on
the way in. The starter Palette ships three profiles and one Spectrum, so two such
profiles exist from the first render; they are visible in the picker and cost
nothing until chosen, but they cannot be deleted without a detour through a
Spectrum. A second selection concept — a profile being edited independently of the
Spectrum reading it — was rejected as the more expensive of the two, and remains
the remedy if the detour bites.

A profile has an id fixed at creation and a name shown on screen, kept separate for the
reason ADR-0004 keeps a spectrum's apart: a spectrum's choice is held against the id, so
renaming a profile touches nothing a spectrum points at and invalidates no shared code.

Version 1 palette codes are read and upgraded rather than refused: each spectrum's chroma
column becomes a profile named after it, and identical profiles collapse into one. "Refuse
rather than guess" governs codes from a format this build does not know; a v1 code is
known, and upgrading it is a faithful translation, since a v1 palette genuinely did hold
one independent chroma sequence per spectrum.
