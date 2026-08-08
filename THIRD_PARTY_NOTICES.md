# Third-party notices

FM1 Editor includes or derives selected third-party components and research assets under their respective licenses. This file records notices for assets that are distributed with the repository/runtime bundle; research references that are not distributed remain documented under `docs/research/`.

## SpiegeLib simple-FM MLP weights

Source project: `spiegelib/vst-fm-sound-match`

Pinned upstream commit: `e1baab7fbeb0bc3f4d4946f8348e77dd18028080`

Original model: `saved_models/simple_fm_mlp.h5`

Original model SHA-256: `96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f`

Distributed derivative: `src/audio/data/spiegelib-simple-fm-mlp.json`

Copyright (c) 2020 spiegel-lib

License: MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The JSON derivative contains the Dense layer tensors and provenance needed to execute the same pinned MLP without a TensorFlow/HDF5 runtime. FM1 Editor's surrounding adapter and semantic mapping are separate project code.

## SpiegeLib simple-FM MFCC dataset/scaler

Archive: *Datasets and supplementary material for “Synthesizer Programming with Intelligent Exploration, Generation and Evaluation” / VST FM sound-matching experiment*

DOI: `10.5281/zenodo.3722784`

Creators: Jordie Shier, George Tzanetakis, Kirk McNally

Archive member used for the scaler: `data_simple_FM_mfcc/data_scaler.pkl`

Archived scaler SHA-256: `99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4`

Distributed derivative when present: `src/audio/data/spiegelib-simple-fm-mfcc-scaler.json`

License: Creative Commons Attribution 4.0 International (CC BY 4.0)

The plain JSON derivative contains only numeric standardization means/standard deviations and source/provenance metadata converted from the archived experiment scaler. Attribution and the DOI must be retained when redistributing that derivative. The license permits sharing and adaptation with appropriate credit, a license reference, and an indication of changes.

License information: https://creativecommons.org/licenses/by/4.0/

## Notes

- The SpiegeLib learned initializer controls only the explicitly documented nine historical Dexed OP2 host parameters and uses a fixed simple-FM base for all other Yamaha semantic voice fields.
- Inclusion of research assets does not imply endorsement by the original authors.
- A model-generated voice is a reconstruction candidate, not proof of patch identity or physical FM-1 equivalence.
- Additional native/WASM third-party notices will be added here before any currently audited-but-not-vendored MSFA source is distributed.
