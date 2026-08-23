# The human-visible gamut boundary in Oklch

Research note for a `maxChroma(lightness, hue) -> number` function returning a **device-independent**
gamut boundary rather than an sRGB/P3 one.

Status: research only, no application code. Every substantive claim carries its source URL.
Numbers labelled **[computed here]** were produced by throwaway scripts written for this note
(pure Python, CVRL data files, matrices as quoted below) — they are reproducible but they are my
computation, not a citation, and should be re-derived by the implementation as a cross-check.

---

## 0. The framing problem: "human-visible gamut" is ambiguous

This matters more than any of the arithmetic below, so it goes first.

There are two different "device-independent boundaries", and they give very different answers:

1. **The spectral cone / full visible gamut.** The set of all XYZ values realisable by *some* light.
   It is a convex cone whose extreme rays are the monochromatic stimuli (the spectral locus) plus
   the purple line. It is *unbounded in luminance* — there is no maximum chroma, because you can
   always add more light. Oklab is positively homogeneous of degree 1/3 under scaling of XYZ
   (the cube root is homogeneous of degree 1/3 and both matrices are linear), so `C/L` is constant
   along each ray and the constraint degenerates to a fixed maximum ratio.
   **[computed here]** max `C/L` over the CIE 1931 spectral locus ≈ **1.264**, i.e. at L=50% the cone
   permits C ≈ 0.63 and at L=90% C ≈ 1.14. That is not a useful palette bound.

2. **The Rösch–MacAdam optimal colour solid (MacAdam limits).** The set of XYZ values realisable by a
   *reflecting object* (reflectance factor in [0,1]) under a specified illuminant, normalised so the
   perfect diffuser is white. This is bounded and closed, and it is what "the boundary of the
   human-visible gamut at a given lightness" almost always means in practice. It is what the task
   description's "Rösch–MacAdam optimal color solid / MacAdam limits" names.

The user-facing consequence: **the Rösch–MacAdam solid is not a superset of display gamuts.** It bounds
*object* colours; emissive displays are not objects. **[computed here]** with D65 and the matrices below:

| primary | Oklch | inside MacAdam limits at that L? |
|---|---|---|
| Display P3 green | `oklch(84.88% 0.3685 145.7)` | **No** — optimal-solid max at L≈85% is ≈0.340 |
| Rec.2020 green | `oklch(82.98% 0.4683 152.6)` | **No** — optimal-solid max at L≈83% is ≈0.351 |
| sRGB green | `oklch(86.64% 0.2948 142.5)` | Yes (max at L≈87% ≈ 0.323) |
| sRGB blue | `oklch(45.20% 0.3133 264.1)` | Yes |

So if `maxChroma()` returns the MacAdam limit and the app also offers P3 output, the function will
report some in-P3 colours as "out of the human gamut". Decide deliberately which of the two
definitions the product wants; this note documents both but assumes (2) unless stated.

(Rec.2020's primaries are monochromatic — 630/532/467 nm per ITU-R BT.2020 —
<https://www.itu.int/rec/R-REC-BT.2020/en>. A monochromatic stimulus at that luminance is simply not
an object colour, which is why it escapes the solid.)

---

## 1. CIE 1931 2° standard observer colour-matching functions

### Authoritative source

The normative definition is **CIE 015:2018, *Colorimetry, 4th Edition***, Table 1
(<https://cie.co.at/publications/colorimetry-4th-edition>). CIE also publishes the CMFs as a
standalone dataset on its data portal:

- CIE 1931 colour-matching functions, 2° observer —
  <https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer>
  DOI **10.25039/CIE.DS.xvudnb9b**, cited by CIE as: *CIE 2019, Colour-matching functions of CIE 1931
  standard colorimetric observer, International Commission on Illumination (CIE), Vienna, AT.*
  The portal page attributes the table to **CIE 018:2019** Table 6 (*The Basis of Physical
  Photometry, 3rd Edition*), at **1 nm steps**.

There is also the ISO/CIE joint standard **ISO/CIE 11664-1:2019** (*Colorimetry — Part 1: CIE standard
colorimetric observers*), which is the same data:
<https://www.iso.org/standard/74164.html>.

### Range and interval

- **Standard tabulation: 360 nm to 830 nm at 1 nm intervals.** This is what CIE 015:2018 Table 1 and
  the CIE data portal publish, and what CVRL mirrors (see below: the 1 nm CSV has exactly 471 rows,
  360…830). **[verified here]**
- The older/abridged tabulation **380–780 nm at 5 nm** is extremely common in textbooks and legacy
  code. CIE 015:2018 §7.1 recommends 1 nm over 360–830 for the reference computation and treats
  coarser intervals as approximations. I could not read CIE 015:2018 itself (paywalled), so treat the
  precise wording of that recommendation as **unverified**; the 360–830 @ 1 nm tabulation itself is
  verified from the CIE data-portal page above.
- Below ~400 nm and above ~700 nm the CMF values are of order 1e-5 to 1e-8. They contribute almost
  nothing to XYZ but they are not zero, and truncating at 380–780 shifts results slightly.

### Where to get a citable, embeddable copy

Practical options, in decreasing order of "primary":

1. **CIE data portal** (link above). Free download after accepting the site's terms; DOI-citable.
2. **CVRL (Colour & Vision Research Laboratory, UCL)** — the standard machine-readable mirror used by
   most of the field: <http://cvrl.ioo.ucl.ac.uk/cmfs.htm>, direct CSV
   <http://cvrl.ioo.ucl.ac.uk/database/data/cmfs/ciexyz31_1.csv> (1 nm, 360–830, 471 rows —
   **[verified here]**, first row `360,0.000129900000,0.000003917000,0.000606100000`).
   Site footer: "Copyright © 1995-2021 Color and Vision Research Labs"
   (<http://www.cvrl.org/main.php>).
3. **colour-science** ships the same tables in `colour/colorimetry/datasets/cmfs.py`, under the
   library's **BSD-3-Clause** licence: <https://github.com/colour-science/colour/blob/develop/LICENSE>.
   This is the easiest defensible provenance for embedding in an open repo — you inherit a clear
   permissive licence on the *file*, and you can cite CIE 015:2018 for the *data*.

### Licensing — flagged as genuinely uncertain

- The CIE data-tables index (<https://cie.co.at/data-tables>) states only that "The datasets contained
  on this page are directly taken from the original publications cited in the metadata" and directs
  users to the cited publication. **It states no licence and no redistribution terms.** **[verified —
  absence of a statement, fetched 2026-08]**
- I found **no** CIE statement expressly permitting redistribution of the CMF tables, and no
  statement forbidding it. CIE sells its publications and asserts copyright over them
  (<https://cie.co.at/publications>), so the conservative reading is that the *publication* is
  copyrighted even if the *numeric data* may not attract copyright in many jurisdictions
  (facts/data-as-such).
- **Do not treat this note as legal advice.** The pragmatic and widely-followed path is option 3
  above: vendor the numbers from a BSD/MIT-licensed library (colour-science) or from CVRL, cite
  CIE 015:2018 / DOI 10.25039/CIE.DS.xvudnb9b in the file header, and note the provenance.
  This is what essentially every open-source colour library does.

### Illuminant D65 SPD

- Normative source: **CIE 015:2018 Table 5** (relative SPDs of the D illuminants), and the CIE data
  portal entry <https://cie.co.at/datatable/cie-standard-illuminant-d65> (DOI 10.25039/CIE.DS.hjfjmt59).
- CIE 015:2018 publishes D65 at **1 nm from 300 nm to 830 nm**, normalised to S(560) = 100.
  Machine-readable mirror: <http://cvrl.ioo.ucl.ac.uk/database/data/cie/Illuminantd65.csv>
  (**[verified here]**: 530 rows, 300→830 at 1 nm, first `300, 0.034100`, last `830, 60.312500`).
- Sanity check **[computed here]**: integrating this D65 against the 1 nm CIE 1931 CMFs over 360–830
  gives chromaticity **x = 0.312727, y = 0.329023**, matching the standard 0.3127/0.3290 quoted in
  CSS Color 4 (<https://www.w3.org/TR/css-color-4/>). Good confirmation that the two files are
  mutually consistent and correctly aligned by wavelength.

---

## 2. The optimal colour solid algorithm

### The theorem

MacAdam (1935), *Maximum Visual Efficiency of Colored Materials*, J. Opt. Soc. Am. 25(11):361–367,
<https://doi.org/10.1364/JOSA.25.000361> — building on Schrödinger (1920) and Rösch (1929) —
establishes that the object-colour solid is convex and that **every boundary point is produced by a
reflectance spectrum that takes only the values 0 and 1, with at most two transitions in the visible
range.** These are the "optimal colours".

Corollary that makes the algorithm cheap: you never need to search over arbitrary spectra. The whole
2-D boundary surface is parameterised by the two transition wavelengths (λ₁, λ₂).

Secondary but useful algorithmic write-ups (both describe the same box-spectrum search, adding
lightness/hue-angle targeting):

- Martínez-Verdú et al., *Computation and visualization of the MacAdam limits for any lightness, hue
  angle, and light source*, JOSA A 24(6):1501–1515 (2007),
  <https://doi.org/10.1364/JOSAA.24.001501>
- Perales et al., *A new algorithm for calculating the MacAdam limits for any luminance factor, hue
  angle and illuminant*, AIC (2005) — PDF copy at
  <http://webserver2.tecgraf.puc-rio.br/~mgattass/fcg/aic_1MacAdamLimits.pdf> (this URL returned
  HTTP 403 to my fetcher, so I am citing it from the search abstract only — **unverified content**;
  the JOSA A paper above is the one to rely on).

Note on colour-science: `colour.volume.macadam_limits` does **not** compute the limits spectrally. It
loads a precomputed vertex table (`OPTIMAL_COLOUR_STIMULI_ILLUMINANTS`, illuminants A, C, D65 at
luminance factors 10…90, 95, taken from Wyszecki & Stiles, *Color Science*, 2nd ed., Table I(3.7)) and
does a Delaunay point-in-hull test.
Source: <https://github.com/colour-science/colour/blob/develop/colour/volume/macadam_limits.py>,
dataset: <https://github.com/colour-science/colour/blob/develop/colour/volume/datasets/optimal_colour_stimuli.py>.
So colour-science is a good *cross-check* dataset but not a reference implementation of the
computation. **[verified by reading both files]**

### Parametrisation

Let the wavelength grid be λ₀ … λ_N (360…830 nm). Define the illuminant-weighted CMF integrands

```
Sx(λ) = D65(λ) · x̄(λ)
Sy(λ) = D65(λ) · ȳ(λ)
Sz(λ) = D65(λ) · z̄(λ)
```

Precompute **prefix sums** (this is the key trick — it makes each candidate O(1) instead of O(N)):

```
Px[k] = Σ_{i<k} Sx(λ_i)·Δλ        (likewise Py, Pz)
```

The white point (perfect diffuser, R ≡ 1) is `Wx = Px[N]`, `Wy = Py[N]`, `Wz = Pz[N]`.

**Type 1 (band-pass):** R = 1 on [λ_i, λ_j), 0 elsewhere.

```
X = Px[j] − Px[i]     Y = Py[j] − Py[i]     Z = Pz[j] − Pz[i]
```

**Type 2 (band-stop / wrap-around / complementary):** R = 0 on [λ_i, λ_j), 1 elsewhere. This is the
case where the "band" wraps around the ends of the spectrum, and it is exactly the complement:

```
X = Wx − (Px[j] − Px[i])          etc.
```

Enumerating `0 ≤ i ≤ j ≤ N` and emitting **both** types covers the entire boundary surface, including
the degenerate corners (i=j → black; i=0, j=N → white; and their complements). No wrap-around index
arithmetic is needed if you use the complement form — this is the single biggest source of bugs in
naive implementations, which try to handle λ₁ > λ₂ by modular indexing and get the endpoint
half-open/closed conventions wrong.

**[computed here]** at 1 nm over 360–830 this is 471 grid points → 111 628 (i, j) pairs → 223 256
boundary samples, computed in well under a second in pure Python with prefix sums.

### Normalisation

Divide XYZ by **Wy**, not by Wx/Wy/Wz separately:

```
X' = X / Wy      Y' = Y / Wy      Z' = Z / Wy
```

This yields absolute XYZ relative to a D65 white of **Y = 1** (Oklab's convention, §3), and preserves
chromaticity. Dividing componentwise by (Wx, Wy, Wz) would be a von Kries normalisation to an
equal-energy white and is **wrong** here — Oklab expects D65-relative XYZ, not white-normalised XYZ.
**[verified here]**: with the correct normalisation, D65 white maps to Oklab (1.000000, −0.00002,
−0.00012) with Ottosson's matrices — see §3 for why it's not exactly zero.

### Pitfalls and numerical issues

1. **Wavelength alignment.** The CMF file starts at 360 nm, the D65 file at 300 nm. Join on the
   wavelength key, do not zip by index. (Cost me nothing here because I joined on key; it is the
   classic off-by-70nm bug.)
2. **Δλ must be consistent.** With a uniform grid Δλ is a constant scale factor that cancels in the
   `X/Wy` normalisation, so it is harmless — but it does *not* cancel if you mix intervals.
3. **Riemann vs trapezoid.** CIE 015:2018's prescribed summation is a plain rectangular sum at 1 nm,
   which is what prefix sums naturally give. Trapezoid changes results in the 6th decimal; irrelevant.
4. **Coarse wavelength sampling is fine for the shape, disastrous for naive binning.**
   **[computed here]**, global max Oklch chroma over the solid:

   | Δλ | global max C | at L | C at L=50% | C at L=20% |
   |---|---|---|---|---|
   | 1 nm | 0.4099 | 54.7% | 0.4063 | 0.2454 |
   | 5 nm | 0.4099 | 54.4% | 0.3779 | 0.2449 |
   | 10 nm | 0.4092 | 52.7% | **0.0000** | **0.0000** |
   | 20 nm | 0.4162 | 56.1% | **0.0000** | **0.0000** |

   The zeros are not "the gamut shrank" — they are *empty lightness bins*. Coarse Δλ produces too few
   surface points to populate a fine L grid. See §5: this is an argument against the naive
   bin-by-lightness approach, not against coarse sampling per se.
5. **Cube root of negatives.** Optimal-colour XYZ values are non-negative, but the LMS values after
   M₁ can go slightly negative for extreme spectral colours. Use a **sign-preserving** cube root
   (`Math.cbrt` in JS), never `Math.pow(x, 1/3)` — the latter returns NaN for negative x. CSS Color 4
   calls this out explicitly in its sample code: *"JavaScript Math.cbrt returns a sign-matched cube
   root — beware if porting to other languages, especially if tempted to use a general power
   function"* (<https://www.w3.org/TR/css-color-4/>, §19).
6. **Hue wrap at 0°/360°.** Use `atan2(b, a)` in degrees, mod 360, and interpolate hue circularly.
7. **Degenerate hue near the achromatic axis.** At C → 0 the hue is meaningless. CSS Color 4 defines
   the OkLCh powerless-hue threshold as **C ≤ 0.000004** (<https://www.w3.org/TR/css-color-4/> §9.4).
8. **Illuminant choice changes the answer.** The MacAdam limits are illuminant-dependent by
   definition. D65 is the right choice here because Oklab/OkLCh are D65-based and CSS is D65-based;
   note this in the API docs so nobody expects a "universal" number.

---

## 3. XYZ → Oklab → Oklch

### Ottosson's matrices (the authoritative Oklab definition)

From <https://bottosson.github.io/posts/oklab/> — **verbatim**:

**M₁ (XYZ → LMS)**

```
+0.8189330101  +0.3618667424  -0.1288597137
+0.0329845436  +0.9293118715  +0.0361456387
+0.0482003018  +0.2643662691  +0.6338517070
```

**Nonlinearity:** `l' = cbrt(l)`, `m' = cbrt(m)`, `s' = cbrt(s)` — a plain cube root, not a
Lab-style linear-segment hybrid.

**M₂ (LMS' → Oklab)**

```
+0.2104542553  +0.7936177850  -0.0040720468
+1.9779984951  -2.4285922050  +0.4505937099
+0.0259040371  +0.7827717662  -0.8086757660
```

Output order is (L, a, b).

**White point and normalisation.** Ottosson's post states Oklab uses a **D65 whitepoint** and XYZ with
**white as Y = 1** (not 100), and that D65 normalised to Y = 1 maps to L = 1, a = 0, b = 0. Oklab L is
therefore in **[0, 1]**; CSS multiplies by 100 for the `%` form
(<https://www.w3.org/TR/css-color-4/>: *"L in range [0,1]. For use in CSS, multiply by 100 and add a
percent"*).

Oklab's parameter fit used CAM16-derived lightness/chroma pairs and the Ebner–Fairchild constant-hue
data, optimised against CIEDE2000 — per the same post. The reference C++ is offered under public
domain / MIT.

### The CSS Color 4 variant — important

CSS Color 4 does **not** use Ottosson's published XYZ↔LMS matrix verbatim. Its sample code says
*"XYZ <-> LMS matrices recalculated for consistent reference white"* and *"recalculated for 64bit
precision"*, citing
<https://github.com/w3c/csswg-drafts/issues/6642#issuecomment-943521484> and
<https://github.com/color-js/color.js/pull/357>. Verbatim from
<https://www.w3.org/TR/css-color-4/> §19:

```js
var XYZtoLMS = [
  [ 0.8190224379967030,  0.3619062600528904, -0.1288737815209879 ],
  [ 0.0329836539323885,  0.9292868615863434,  0.0361446663506424 ],
  [ 0.0481771893596242,  0.2642395317527308,  0.6335478284694309 ]
];
var LMStoOKLab = [
  [ 0.2104542683093140,  0.7936177747023054, -0.0040720430116193 ],
  [ 1.9779985324311684, -2.4285922420485799,  0.4505937096174110 ],
  [ 0.0259040424655478,  0.7827717124575296, -0.8086757549230774 ]
];
```

and the inverse:

```js
var LMStoXYZ  = [
  [  1.2268798758459243, -0.5578149944602171,  0.2813910456659647 ],
  [ -0.0405757452148008,  1.1122868032803170, -0.0717110580655164 ],
  [ -0.0763729366746601, -0.4214933324022432,  1.5869240198367816 ]
];
var OKLabtoLMS = [
  [  1.0000000000000000,  0.3963377773761749,  0.2158037573099136 ],
  [  1.0000000000000000, -0.1055613458156586, -0.0638541728258133 ],
  [  1.0000000000000000, -0.0894841775298119, -1.2914855480194092 ]
];
```

The rationale, quoted from the csswg comment (retrieved via the GitHub API,
`repos/w3c/csswg-drafts/issues/comments/943521484`): Ottosson's XYZ matrix "assumes an XYZ -> Linear
sRGB transfer matrix that doesn't align with what is actually suggested for sRGB in the CSS spec …
using the XYZ matrix as specified by the Oklab article assumes the white point that he used, but CSS
uses a different white point, so this introduces noise."

**[computed here]** the practical difference:

| matrix set | D65 white (0.3127/0.3290, Y=1) → Oklab | global max C on the solid | C at L=50% |
|---|---|---|---|
| Ottosson (as published) | (0.999999, −0.000022, −0.000123) | 0.40986 | 0.40633 |
| CSS Color 4 (recalculated) | (1.000000, −0.0000000, 0.0000000) | 0.40980 | 0.40627 |

The difference is ~6 × 10⁻⁵ in chroma — visually irrelevant, but the CSS matrices make D65 white land
on exactly a = b = 0, which is worth having because a "human gamut boundary" function should return
C = 0 for white, not 1.2 × 10⁻⁴.

**Recommendation:** use the **CSS Color 4 matrices**, since this app emits CSS `oklch()` and should
agree bit-for-bit with what browsers compute. Cite Ottosson as the definition of the space and CSS
Color 4 as the source of the specific coefficients.

### Oklab → Oklch

```
C = sqrt(a² + b²)
h = atan2(b, a) · 180/π,  wrapped into [0, 360)
```

(<https://www.w3.org/TR/css-color-4/> §9.5.) CSS's percentage reference ranges — useful for API
design — are, verbatim from §9.4: for `oklab()` "for L: 0% = 0.0, 100% = 1.0; for a and b: -100% =
-0.4, 100% = 0.4"; for `oklch()` "for L: 0% = 0.0, 100% = 1.0; for C: 0% = 0.0, 100% = 0.4".
That 0.4 anchor is itself a good hint about the magnitudes below.

---

## 4. Expected magnitudes (sanity checks)

All **[computed here]** with 1 nm CIE 1931 2° CMFs, CIE D65 1 nm, CSS Color 4 matrices, prefix-sum box
spectra over 360–830. Chroma binned by nearest 0.1% of L (so these are slight *under*-estimates of the
true supremum in each bin — see §5).

### Rösch–MacAdam optimal colour solid under D65

```
  L        Cmax
  1%      0.0131
  5%      0.0637
 10%      0.1263
 15%      0.1878
 20%      0.2454
 25%      0.2972
 30%      0.3370
 35%      0.3605
 40%      0.3809
 45%      0.3966
 50%      0.4063     <-- answer to "max chroma at L=50%": ~0.406
 55%      0.4095     <-- global maximum ~0.410 at L≈54.7%
 60%      0.4051
 65%      0.3909
 70%      0.3855
 75%      0.3817
 80%      0.3669
 85%      0.3403
 90%      0.3008
 95%      0.2551
 99%      0.1294
 99.5%    0.0679
 99.9%    0.0183
100%      0.0000
```

Shape summary:

- **Global maximum ≈ 0.410, at L ≈ 55%**, hue ≈ 322° (magenta/purple region).
- **As L → 0** the boundary is very nearly **linear in L**: C ≈ 1.31 · L near L = 1%.
  This is expected — near black the object solid asymptotically approaches the spectral cone, whose
  slope is the 1.264 figure from §0. The two agreeing to ~4% is a good independent cross-check of the
  whole pipeline. **The function must return C → 0 as L → 0, not a constant.**
- **As L → 1** the boundary collapses much more sharply than at the dark end: still 0.30 at L=90% but
  0.13 at L=99% and 0 at L=100%. The falloff near white is steeper than linear.
- The solid is **not** symmetric about L=50% and **not** a smooth ellipse; there are visible kinks
  (e.g. between L=30% and L=40% the maximising hue jumps from ~289° to ~310°, and above L≈68% it jumps
  to the green side, ~155°). A single analytic curve will not capture this well — see §5.

### Max chroma per hue at L = 50% (24 buckets, D65 optimal solid)

```
   h≈7°  0.290    h≈127°  0.190    h≈247°  0.336
  h≈22°  0.268    h≈142°  0.270    h≈262°  0.323
  h≈37°  0.233    h≈157°  0.352    h≈277°  0.328
  h≈52°  0.171    h≈172°  0.354    h≈292°  0.362
  h≈67°  0.144    h≈187°  0.345    h≈307°  0.401
  h≈82°  0.133    h≈202°  0.329    h≈322°  0.409
  h≈97°  0.136    h≈217°  0.321    h≈337°  0.393
 h≈112°  0.152    h≈232°  0.331    h≈352°  0.334
```

Note the deep trough around yellow (h ≈ 80–100°, C ≈ 0.13): at 50% lightness, yellows are intrinsically
close to the achromatic axis because a saturated yellow is inherently light. This is real and is one of
the main reasons a per-hue boundary is worth having at all rather than a single scalar cap.

### Display gamuts, for comparison

**[computed here]**, brute-forced over the RGB cube surface at 1/64 steps, CSS Color 4 matrices,
primaries from <https://www.w3.org/TR/css-color-4/> §10:

| gamut | max Oklch chroma | where |
|---|---|---|
| **sRGB** | **0.3225** | L = 70.2%, h = 328.3° — pure magenta (linear rgb 1,0,1) |
| **Display P3** | **0.3685** | L = 84.9%, h = 145.7° — pure green |
| **Rec.2020** | **0.4683** | L = 83.0%, h = 152.6° — pure green |

Primaries verbatim:

| | sRGB | Display P3 | Rec.2020 |
|---|---|---|---|
| red | `oklch(62.80% 0.2576 29.2)` | `oklch(64.86% 0.2994 29.0)` | `oklch(68.71% 0.3647 24.2)` |
| green | `oklch(86.64% 0.2948 142.5)` | `oklch(84.88% 0.3685 145.7)` | `oklch(82.98% 0.4683 152.6)` |
| blue | `oklch(45.20% 0.3133 264.1)` | `oklch(46.64% 0.3233 264.1)` | `oklch(42.34% 0.3829 245.1)` |

**The "sRGB blue ≈ oklch(45% 0.31 264)" claim is VERIFIED.** My computation gives
`oklch(45.20% 0.3133 264.1)`, and CSS Color 4 §7 states in prose: *"In OkLCh, sRGB blue is
oklch(0.452 0.313 264.1)"* — an exact match to 4 significant figures
(<https://www.w3.org/TR/css-color-4/>).

Rough takeaway for scaling the UI: **the optimal colour solid is only ~25% wider than sRGB at its
widest (0.41 vs 0.32), and Rec.2020 exceeds it.** If the goal was "give designers more room than
sRGB", the MacAdam limit gives less headroom than one might assume.

---

## 5. Practical implementation guidance

### Do not naively bin by lightness

The obvious algorithm — enumerate (λ₁, λ₂), convert to Oklch, bucket by (L, h), keep the max C — has a
**coverage** problem, because the boundary surface is a 2-D sheet that maps unevenly into (L, h).

**[computed here]**, counting occupancy of a 1%-L × 1°-hue grid (36 000 cells):

| sampling | boundary samples | occupied cells |
|---|---|---|
| 1 nm | 223 256 | 25 560 / 36 000 (71%) |
| 0.25 nm (linear-interpolated CMFs) | 3 540 000 | 32 628 / 36 000 (91%) |

Even at 0.25 nm and 3.5M samples there are holes, and the median occupied cell holds only ~2 samples,
so bin maxima are noisy lower bounds. Quadrupling the sample count again is not the answer.

### Recommended algorithm

Treat the (λ₁, λ₂) grid as a **triangulated surface mesh in Oklab**, not a point cloud:

1. Enumerate the mesh at a modest resolution — **1 nm over 360–830 is plenty** (471 × 471 → ~223k
   vertices, both types) — and store Oklab (L, a, b) per vertex.
2. For each of your target hue planes h_k, intersect each mesh **triangle** with the half-plane
   `atan2(b,a) = h_k`. Each intersected triangle yields a line segment in (L, C). This fills the gaps
   that point binning leaves, because you interpolate *along the surface* rather than hoping a vertex
   lands in your bin.
3. For each hue plane, the union of segments is a closed contour in (L, C); take its **upper envelope
   in C as a function of L** (the outer boundary). Resample that envelope at your L grid.

This gives a dense, hole-free `Cmax(L, h)` from a coarse mesh, and it is exactly the "constant
hue-angle profile" construction Martínez-Verdú et al. use
(<https://doi.org/10.1364/JOSAA.24.001501>).

If the triangle-intersection is more machinery than you want, the cheap fallback is: bin at 1 nm,
then run a **per-hue monotone upper-hull fill** over L (fill empty bins by linear interpolation
between their populated neighbours, then take a running upper hull to remove sampling noise). This is
approximate — flag it in the code — but the sampled bins from §4 are already accurate to ~1e-3.

### Resolution and LUT sizing

Perceptual threshold: ΔE_OK of ~0.002 in Oklab is around the just-noticeable level
(<https://www.w3.org/TR/css-color-4/> §20.3 defines ΔE_OK as plain Euclidean distance in Oklab), and
for a *gamut boundary* used to clamp a slider you need much less than that — the boundary curve is
smooth over most of its extent.

Recommended LUT:

- **Hue: 360 buckets (1°).** The hue slice in §4 varies by ~0.02 chroma per 15°, so 1° gives
  ~0.0015 max step — smooth. 72 buckets (5°) would give ~0.007 steps, visible as a stepped slider max.
- **Lightness: 101 samples (0…100 by 1%)**, plus **extra samples in the last 2%** (L = 98, 99, 99.5,
  99.9, 100) because the boundary falls off very steeply near white (0.30 → 0.13 → 0.07 → 0.02 → 0
  across L = 90 → 100). Uniform 1% sampling near white will over-report chroma by a lot.
- **Size:** 360 × 101 = 36 360 entries. As `Float32Array` that is **145 KB**; as `Uint8Array` scaled
  by 0.41/255 (quantisation step 0.0016, below the perceptual threshold) it is **36 KB**, or ~12–15 KB
  gzipped since the surface is very smooth. **Uint8 is the right call** — 36 KB raw / ~13 KB over the
  wire is cheap, and the quantisation error is invisible.
- **Precompute at build time.** Generating the mesh costs a fraction of a second, but embedding a LUT
  removes the CMF and D65 tables (471 + 530 rows) from the client bundle entirely, which is the bigger
  win. Ship the generator script in the repo so the LUT is reproducible.

### Interpolation

- **Between hues:** circular linear interpolation (wrap 359° → 0°). Bilinear over (L, h) is fine.
- **Between lightness levels:** **linear**, not spline. The boundary has genuine kinks (the maximising
  hue jumps around L≈35% and again around L≈68%, §4), so a Catmull-Rom or cubic spline will overshoot
  *outside* the gamut near those kinks — which is the one direction of error you cannot afford in a
  clamping function. If you want smoothness, interpolate linearly and then **clamp to the linear
  result**, or bias splines inward.
- **Safety margin:** because linear interpolation between samples on a locally concave stretch of the
  boundary can land marginally outside, either (a) shrink stored values by a small epsilon (~0.002,
  below JND) or (b) store the min of the neighbouring bins. Prefer (a).

### Do not fit an analytic curve

I'd advise against it. The cross-section is not an ellipse or a triangle: it has a flat-ish shoulder
from L≈45–60%, a near-linear dark limb, a steep collapse above L≈90%, and hue-dependent kinks. A
2-parameter fit will be wrong by 0.02–0.05 chroma in places (5–12% relative), which is very visible
on a chroma slider. The 36 KB LUT is cheaper than the debugging.

---

## 6. Open questions / things I could not verify

1. **CIE licensing.** No CIE statement either permitting or forbidding redistribution of the CMF
   tables was found. Flagged in §1; recommend vendoring via colour-science's BSD-3-Clause files and
   citing CIE, but this is a judgement call, not a verified permission.
2. **CIE 015:2018 wording** on the recommended 1 nm / 360–830 summation is paywalled and quoted here
   only indirectly. The dataset range/interval itself is verified from the CIE data portal.
3. **Perales et al. (2005)** could not be fetched (HTTP 403); cited from abstract only. The JOSA A
   2007 paper is the reliable citation for the same algorithm.
4. **My computed numbers have not been cross-validated** against colour-science's Wyszecki & Stiles
   optimal-stimuli table (that table is in xyY at luminance factors 10…95, so comparing requires a
   conversion pass). Doing that comparison is the single highest-value verification step before
   trusting the LUT — recommend it as the first test the implementation writes.
5. **Which definition the product wants** (§0) is a product decision, not a research finding. The
   MacAdam limit excludes some in-P3 colours; that will look like a bug to anyone who tries it.

---

## Sources

- Ottosson, B. — *A perceptual color space for image processing* (Oklab): <https://bottosson.github.io/posts/oklab/>
- W3C — CSS Color Module Level 4: <https://www.w3.org/TR/css-color-4/> (and editor's draft <https://drafts.csswg.org/css-color-4/>)
- csswg-drafts issue 6642, comment on recalculated Oklab matrices: <https://github.com/w3c/csswg-drafts/issues/6642#issuecomment-943521484>
- color.js PR 357 (64-bit matrix recalculation): <https://github.com/color-js/color.js/pull/357>
- CIE — CIE 1931 colour-matching functions, 2° observer (DOI 10.25039/CIE.DS.xvudnb9b): <https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer>
- CIE — Standard Illuminant D65 (DOI 10.25039/CIE.DS.hjfjmt59): <https://cie.co.at/datatable/cie-standard-illuminant-d65>
- CIE — Datasets index / terms notice: <https://cie.co.at/data-tables>
- CIE 015:2018 Colorimetry, 4th ed.: <https://cie.co.at/publications/colorimetry-4th-edition>
- ISO/CIE 11664-1:2019: <https://www.iso.org/standard/74164.html>
- CVRL (UCL) CMF and illuminant CSVs: <http://cvrl.ioo.ucl.ac.uk/cmfs.htm>, <http://www.cvrl.org/main.php>
- MacAdam, D. L. (1935), *Maximum Visual Efficiency of Colored Materials*: <https://doi.org/10.1364/JOSA.25.000361>
- Martínez-Verdú et al. (2007), *Computation and visualization of the MacAdam limits…*: <https://doi.org/10.1364/JOSAA.24.001501>
- colour-science `macadam_limits.py`: <https://github.com/colour-science/colour/blob/develop/colour/volume/macadam_limits.py>
- colour-science `optimal_colour_stimuli.py`: <https://github.com/colour-science/colour/blob/develop/colour/volume/datasets/optimal_colour_stimuli.py>
- colour-science licence (BSD-3-Clause): <https://github.com/colour-science/colour/blob/develop/LICENSE>
- ITU-R BT.2020: <https://www.itu.int/rec/R-REC-BT.2020/en>
