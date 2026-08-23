# Online CSS color palette generator

This is a tool that uses OKLCH color mechanics to generate a custom css color palette/spectrum.

## How the user interacts with the tool

The main user input is a list of input rows which the user can add or remove, each row includes 3 input fields that correspond to the 3 distinct aspects of the OKLCH specification. The first input is Lightness as a percentage, the second input is Chroma as a unitless value between 0 and 0.5, the third input is Hue as an angle in degrees. When the user adds a new row, it should be pre-populated with the values of the last row. Rows can be dragged to re-arrange the order.

## Charts

### Oklch 2D cross section

While the user is setting the values of each row, the row that the use is currently focused should inform a chart of the Oklch color space cross section.

This chart is a horizontal 2D cross section of the Oklch color space at the specific lightness value of the given row. The chart should display the slice using polar co-ordinates.

One coordinate for the slice is the angle around the origin in degrees, and the other co-ordinate is the chroma (how for away from the origin). The shape of the slice should represent all possible colors for the given lightness level, and therefore the shape of the slice is very important to get right.

The current Chroma value of the selected row should present as a thin circle/ring centered around the origin with radius equal to the Chroma. The chroma ring may intersect with the slice

The current hue value of the selected row presents as a thin straight line pointing from the origin out to the edge, with a length of 0.5 (the radial axis maximum). This line is expected to intersect with the chroma ring and the slice.

### Lightness scale linear indicator

There should be a linear indicator representing the lightness scale from 0% to 100%. The lightness levels of the users color spectrum should present as markers along the scale to provide visual indication of the distribution and spacing of lightness levels.

### Color scale tiles

There should be a set of tiles with the background color set to the corresponding colors of the spectrum.

## The output

Code block of css variables which the user can copy-paste into their projects. The output will need to be in hex colors. Each input row translates to one css color variable. with the number representing the "shade" and counts up by multiples of 100 for each color the user adds to their palette. Example:

```css
--color-100: #f8f9ff;
--color-200: #ecefff;
--color-300: #dbdeff;
--color-400: #c0c0ff;
--color-500: #9790ff;
--color-600: #7864ff;
--color-700: #5b48d8;
--color-800: #493ab0;
--color-900: #3a2f8e;
--color-1000: #231e58;
--color-1100: #17143a;
--color-1200: #0e0e21;
--color-1300: #070710;
```

Where a color does not map to a hex value, a fallback is calculated by reducing the chroma value until it does. The authored Oklch values are never overwritten by this — the fallback is derived at export time only. Lines whose color fell back carry a trailing CSS comment noting the delivered chroma, so a fallback is visible to someone reading only the output and never the chart.

Output is produced by a formatter over the palette. Hex is the only formatter for now; an Oklch output format is a likely future addition, and would apply no fallback at all.
