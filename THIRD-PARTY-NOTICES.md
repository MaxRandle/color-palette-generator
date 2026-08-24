# Third-party notices

## mattpocock/skills

The skill definitions vendored under `.claude/skills/` and `.agents/skills/` are
copied from https://github.com/mattpocock/skills (see `skills-lock.json` for the
exact source paths and content hashes). They are redistributed here under the MIT
License, reproduced in full below.

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## colour-science

The colorimetric data under `core/gamut/data/` is vendored from
https://github.com/colour-science/colour:

- `cie-1931-cmfs.ts` — `colour/colorimetry/datasets/cmfs.py`, the CIE 1931 2
  degree standard observer color-matching functions.
- `cie-d65.ts` — `colour/colorimetry/datasets/illuminants/sds.py`, the relative
  spectral power distribution of CIE standard illuminant D65.
- `wyszecki-stiles-optimal-stimuli.ts` —
  `colour/volume/datasets/optimal_colour_stimuli.py`, optimal color stimuli
  under D65 from Wyszecki & Stiles, *Color Science*, 2nd ed., Table I(3.7).

The numbers themselves originate with the CIE (CIE 015:2018 Tables 1 and 5,
DOI 10.25039/CIE.DS.xvudnb9b and DOI 10.25039/CIE.DS.hjfjmt59) and with
Wyszecki & Stiles; they are redistributed here under colour-science's
BSD-3-Clause License, reproduced in full below.

```
Copyright 2013 Colour Developers

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE
```
