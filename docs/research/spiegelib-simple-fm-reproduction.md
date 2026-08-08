# SpiegeLib simple-FM MLP reproduction

FM1 Editor source commit: `3a0db34a611e98dc8ba36285273ec17ddf2db4a7`

Reproduction status: **PARTIAL**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-adapter | 0 |
| focused-package | 0 |
| full-test | 0 |
| build | 0 |

## Pinned upstream artifacts

- upstream commit: `e1baab7fbeb0bc3f4d4946f8348e77dd18028080`
- model: `saved_models/simple_fm_mlp.h5` — 424616 bytes — SHA-256 `96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f`
- synth configuration: `synth_params/dexed_simple_fm.json` — SHA-256 `3f604ba1b45fa9dcfdaabe7b1f4d5b7a074b0812cb9e5cd0a9e31625bdcf75bc`
- upstream license: `LICENSE` — SHA-256 `36fb291fa97b21994b48be17273e654078ffe06f684d4f1392bfe98218072dd9`
- dense architecture: `[{'name': 'dense', 'units': 50, 'activation': 'relu', 'batch_input_shape': [None, 572]}, {'name': 'dense_1', 'units': 40, 'activation': 'relu', 'batch_input_shape': None}, {'name': 'dense_2', 'units': 30, 'activation': 'relu', 'batch_input_shape': None}, {'name': 'dense_3', 'units': 9, 'activation': 'linear', 'batch_input_shape': None}]`
- pure NumPy zero-standardized-input output: `[0.6124379929800317, 0.5408504640884475, 0.5041409913266433, 0.2920537433005924, 0.6022224477065428, 0.5019347547822712, 0.6914192139253964, 0.46468255912922046, 0.4895537459963921]`
- committed scaler matches: `[]`

The pinned HDF5 checkpoint is structurally reproducible without TensorFlow: the workflow loads its stored Dense weights with h5py and performs the 572 → 50 → 40 → 30 → 9 ReLU/linear forward pass in NumPy. FM1 Editor separately validates the explicit nine-output Dexed-host-parameter mapping and standards-valid 155-byte Yamaha voice encoding.

The upstream experiment requires a fitted MFCC `data_scaler.pkl` for raw-audio inference. No such scaler is committed in the pinned upstream checkout, so end-to-end audio preprocessing cannot be reproduced exactly from the published artifacts. The product benchmark learned-initialization row must remain unavailable until that scaler is recovered with compatible provenance or the model is retrained with a repository-owned reproducible scaler/dataset.

This receipt does not add the upstream HDF5 model or scaler to FM1 Editor and does not enable server upload/inference.
