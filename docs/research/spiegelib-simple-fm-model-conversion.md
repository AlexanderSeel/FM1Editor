# SpiegeLib simple-FM MLP model conversion

FM1 Editor source commit: `0f59c53b55ddf6f26ed3d8d2a55caf17da6b1b9a`

Conversion status: **SUCCESS**

- upstream: `spiegelib/vst-fm-sound-match` commit `e1baab7fbeb0bc3f4d4946f8348e77dd18028080`
- source model: `saved_models/simple_fm_mlp.h5` — SHA-256 `96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f`
- converted JSON: `src/audio/data/spiegelib-simple-fm-mlp.json` — 661267 bytes — SHA-256 `3dd5b9bc8ddef4fffd018a53f3b4902e9ad73afd2e1badc5f96d01600a8e44ac`
- architecture: `572 → 50 ReLU → 40 ReLU → 30 ReLU → 9 linear`
- license: MIT; Copyright (c) 2020 spiegel-lib

The conversion stores only deterministic Float32 Dense kernels/biases and provenance metadata. It removes the runtime TensorFlow/HDF5 dependency but does not change the learned model or enable the product benchmark row by itself.
