/**
 * Build-time computation of the Rösch–MacAdam optimal color solid — this
 * project's definition of the Visible gamut — as the table `maxChroma()` reads.
 * Nothing here ships to the browser: the generator script runs it, and the
 * result is committed as `max-chroma-table.generated.ts`.
 *
 * Every boundary color of the solid comes from a reflectance that is 0 or 1
 * with at most two transitions (MacAdam 1935), so the whole boundary is the
 * surface swept by a pair of transition wavelengths. See
 * `docs/research/human-gamut-boundary.md`.
 */

import { converter } from "culori";
import {
  CIE_1931_CMFS,
  CIE_1931_CMFS_FIRST_WAVELENGTH,
} from "./data/cie-1931-cmfs.ts";
import { CIE_D65, CIE_D65_FIRST_WAVELENGTH, CIE_D65_STEP } from "./data/cie-d65.ts";
import {
  HUE_STEPS,
  LIGHTNESS_STEP,
  LIGHTNESS_STEPS,
  type MaxChromaTable,
  emptyTable,
  setMaxChroma,
} from "./table.ts";

/**
 * The integration grid: 1 nm, the interval CIE 015:2018 prescribes for the
 * reference computation, from the first tabulated color-matching function to
 * the last wavelength the vendored D65 table covers. The figures this is
 * checked against ran to 830 nm; beyond 780 the color-matching functions are of
 * order 1e-5, and the two agree to within the checks' own binning error.
 */
const FIRST_WAVELENGTH = 360;
const LAST_WAVELENGTH = 780;
const WAVELENGTHS = LAST_WAVELENGTH - FIRST_WAVELENGTH + 1;

/** D65's relative power at one nanometre, interpolated within its 5 nm table. */
function illuminantAt(wavelength: number): number {
  const position = (wavelength - CIE_D65_FIRST_WAVELENGTH) / CIE_D65_STEP;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, CIE_D65.length - 1);
  return CIE_D65[lower] + (CIE_D65[upper] - CIE_D65[lower]) * (position - lower);
}

function colorMatchingAt(
  wavelength: number,
): readonly [number, number, number] {
  return CIE_1931_CMFS[wavelength - CIE_1931_CMFS_FIRST_WAVELENGTH];
}

type PrefixSums = {
  /** `x[k]` is the illuminant-weighted x̄ integrated below the k-th wavelength. */
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
};

/**
 * Running integrals of the illuminant-weighted color-matching functions, which
 * turn any box-shaped reflectance into a difference of two lookups.
 */
function prefixSums(): PrefixSums {
  const x = new Float64Array(WAVELENGTHS + 1);
  const y = new Float64Array(WAVELENGTHS + 1);
  const z = new Float64Array(WAVELENGTHS + 1);
  for (let step = 0; step < WAVELENGTHS; step += 1) {
    const wavelength = FIRST_WAVELENGTH + step;
    const power = illuminantAt(wavelength);
    const [xBar, yBar, zBar] = colorMatchingAt(wavelength);
    x[step + 1] = x[step] + power * xBar;
    y[step + 1] = y[step] + power * yBar;
    z[step + 1] = z[step] + power * zBar;
  }
  return { x, y, z };
}

/**
 * The perfect diffuser under D65, in CIE xy. Reading 0.3127, 0.3290 back is the
 * cheapest check that the two vendored tables are aligned by wavelength.
 */
export function whitePointChromaticity(): { x: number; y: number } {
  const { x, y, z } = prefixSums();
  const total = x[WAVELENGTHS] + y[WAVELENGTHS] + z[WAVELENGTHS];
  return { x: x[WAVELENGTHS] / total, y: y[WAVELENGTHS] / total };
}

const toOklab = converter("oklab");

/**
 * The boundary surface as two sheets of Oklab vertices, indexed by the pair of
 * transition wavelengths. A band-pass reflectance (1 between the transitions)
 * and its complement, a band-stop one, together cover the whole surface;
 * writing the wrap-around case as a complement avoids the modular index
 * arithmetic that this computation is usually got wrong by.
 */
type Sheet = Float64Array;

function sheets(): readonly [Sheet, Sheet] {
  const { x, y, z } = prefixSums();
  const whiteY = y[WAVELENGTHS];
  const stride = WAVELENGTHS + 1;
  const bandPass = new Float64Array(stride * stride * 3);
  const bandStop = new Float64Array(stride * stride * 3);

  for (let from = 0; from <= WAVELENGTHS; from += 1) {
    for (let to = from; to <= WAVELENGTHS; to += 1) {
      const passX = (x[to] - x[from]) / whiteY;
      const passY = (y[to] - y[from]) / whiteY;
      const passZ = (z[to] - z[from]) / whiteY;
      const at = (from * stride + to) * 3;
      writeOklab(bandPass, at, passX, passY, passZ);
      writeOklab(
        bandStop,
        at,
        x[WAVELENGTHS] / whiteY - passX,
        1 - passY,
        z[WAVELENGTHS] / whiteY - passZ,
      );
    }
  }
  return [bandPass, bandStop];
}

function writeOklab(
  sheet: Sheet,
  at: number,
  x: number,
  y: number,
  z: number,
): void {
  const { l, a, b } = toOklab({ mode: "xyz65", x, y, z });
  sheet[at] = l * 100;
  sheet[at + 1] = a;
  sheet[at + 2] = b;
}

const DEGREES = Math.PI / 180;
const COSINES = Array.from({ length: HUE_STEPS }, (_, hue) =>
  Math.cos(hue * DEGREES),
);
const SINES = Array.from({ length: HUE_STEPS }, (_, hue) =>
  Math.sin(hue * DEGREES),
);

/**
 * The greatest Chroma on the solid at each grid point, as raw Chroma.
 *
 * Each mesh triangle is intersected with each Hue half-plane it spans, giving a
 * line segment in (Lightness, Chroma) that is sampled onto the Lightness grid.
 * Binning the vertices instead would leave holes — the surface maps unevenly
 * into Lightness and Hue, and empty bins read as gamut collapse that is not
 * there.
 */
function boundary(): Float64Array {
  const grid = new Float64Array(LIGHTNESS_STEPS * HUE_STEPS);
  const stride = WAVELENGTHS + 1;
  // One triangle's three Oklab vertices, held as parallel arrays and refilled
  // in place: the loop below runs some 350,000 times per sheet, and allocating
  // a vertex type per corner dominates everything else it does.
  const lightness = [0, 0, 0];
  const a = [0, 0, 0];
  const b = [0, 0, 0];

  const corner = (sheet: Sheet, from: number, to: number, vertex: number) => {
    const at = (from * stride + to) * 3;
    lightness[vertex] = sheet[at];
    a[vertex] = sheet[at + 1];
    b[vertex] = sheet[at + 2];
  };

  for (const sheet of sheets()) {
    for (let from = 0; from < WAVELENGTHS; from += 1) {
      for (let to = from + 1; to < WAVELENGTHS; to += 1) {
        corner(sheet, from, to, 0);
        corner(sheet, from + 1, to, 1);
        corner(sheet, from, to + 1, 2);
        accumulateTriangle(grid, lightness, a, b);

        corner(sheet, from + 1, to + 1, 0);
        accumulateTriangle(grid, lightness, a, b);
      }
    }
  }
  return grid;
}

/** The arc of Hue a triangle spans, as a start angle and a length in degrees. */
function hueArc(a: readonly number[], b: readonly number[]) {
  const hues = a
    .map((_, vertex) => {
      const degrees = Math.atan2(b[vertex], a[vertex]) / DEGREES;
      return (degrees + 360) % 360;
    })
    .sort((one, other) => one - other);

  // The arc covering all three is the complement of the widest gap between them.
  const gaps = [
    hues[1] - hues[0],
    hues[2] - hues[1],
    hues[0] + 360 - hues[2],
  ];
  const widest = gaps.indexOf(Math.max(...gaps));
  const start = hues[(widest + 1) % 3];
  const end = hues[widest] + (widest === 2 ? 0 : 360);
  return { start, end };
}

function accumulateTriangle(
  grid: Float64Array,
  lightness: readonly number[],
  a: readonly number[],
  b: readonly number[],
): void {
  const { start, end } = hueArc(a, b);
  for (let hue = Math.ceil(start); hue <= end; hue += 1) {
    accumulatePlane(grid, lightness, a, b, hue % HUE_STEPS);
  }
}

/**
 * Where the triangle crosses one Hue half-plane, written onto that Hue's column
 * of the grid.
 */
function accumulatePlane(
  grid: Float64Array,
  lightness: readonly number[],
  a: readonly number[],
  b: readonly number[],
  hue: number,
): void {
  const cosine = COSINES[hue];
  const sine = SINES[hue];
  const crossedLightness = [0, 0, 0];
  const crossedChroma = [0, 0, 0];
  let crossings = 0;

  for (let vertex = 0; vertex < 3; vertex += 1) {
    const next = (vertex + 1) % 3;
    // Signed distance from the line through the origin at this Hue.
    const here = a[vertex] * sine - b[vertex] * cosine;
    const there = a[next] * sine - b[next] * cosine;
    if (here > 0 === there > 0) continue;

    const along = here / (here - there);
    const crossedA = a[vertex] + (a[next] - a[vertex]) * along;
    const crossedB = b[vertex] + (b[next] - b[vertex]) * along;
    // On the line, the projection onto the Hue direction is the Chroma; a
    // negative projection is the opposite Hue, 180 degrees away.
    const chroma = crossedA * cosine + crossedB * sine;
    if (chroma < 0) continue;

    crossedChroma[crossings] = chroma;
    crossedLightness[crossings] =
      lightness[vertex] + (lightness[next] - lightness[vertex]) * along;
    crossings += 1;
  }

  // A triangle meets the half-plane in a segment. Three crossings mean a vertex
  // sits on the plane and was counted from both of its edges — the black corner
  // every triangle along the diagonal of the mesh shares — so the segment is
  // still the two extremes.
  if (crossings < 2) return;
  let lowest = 0;
  let highest = 0;
  for (let crossing = 1; crossing < crossings; crossing += 1) {
    if (crossedLightness[crossing] < crossedLightness[lowest]) lowest = crossing;
    if (crossedLightness[crossing] > crossedLightness[highest]) highest = crossing;
  }

  const fromLightness = crossedLightness[lowest];
  const toLightness = crossedLightness[highest];
  const fromChroma = crossedChroma[lowest];
  const toChroma = crossedChroma[highest];
  const span = toLightness - fromLightness;
  const firstStep = Math.max(Math.ceil(fromLightness / LIGHTNESS_STEP), 0);
  const lastStep = Math.min(
    Math.floor(toLightness / LIGHTNESS_STEP),
    LIGHTNESS_STEPS - 1,
  );
  for (let step = firstStep; step <= lastStep; step += 1) {
    const along =
      span === 0 ? 0 : (step * LIGHTNESS_STEP - fromLightness) / span;
    const chroma = fromChroma + (toChroma - fromChroma) * along;
    const at = step * HUE_STEPS + hue;
    if (chroma > grid[at]) grid[at] = chroma;
  }
}

/**
 * The Visible gamut boundary as the committed table. Black and white are
 * anchored to exactly zero Chroma: the solid closes to a point at both ends,
 * and sampling alone leaves a sliver of Chroma there.
 */
export function computeMaxChromaTable(): MaxChromaTable {
  const grid = boundary();
  const table = emptyTable();
  for (let step = 1; step < LIGHTNESS_STEPS - 1; step += 1) {
    for (let hue = 0; hue < HUE_STEPS; hue += 1) {
      setMaxChroma(table, step, hue, grid[step * HUE_STEPS + hue]);
    }
  }
  return table;
}
