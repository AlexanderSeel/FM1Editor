# SpiegeLib Zenodo dataset/scaler inspection

FM1 Editor source commit: `bf28c187476fd530cfcc7cf143e3452fa4394625`

Archive DOI: `10.5281/zenodo.3722784`

## Zenodo files

- `data_simple_FM_stft.zip` — 8311970616 bytes — `md5:e1531cd9319f809177c0ea560d8c4692`
- `data_simple_FM_mfcc.zip` — 128253670 bytes — `md5:7c9357219b70c07a4ab115d332f78ef5`
- `evaluation.zip` — 32873470 bytes — `md5:6a5a04f12738bacabad56b33b933adc3`
- `saved_models.zip` — 11419325 bytes — `md5:565535f2c64db86100110cf82b587b05`
- `synth_params.zip` — 3658 bytes — `md5:3fa191352991d8d17b2b1caa3ee50861`

## MFCC candidate

- selected: `{'key': 'data_simple_FM_mfcc.zip', 'size': 128253670, 'checksum': 'md5:7c9357219b70c07a4ab115d332f78ef5', 'download': 'https://zenodo.org/api/records/3722784/files/data_simple_FM_mfcc.zip/content'}`
- downloaded: `True`
- scaler members: `['data_simple_FM_mfcc/data_scaler.pkl']`
- scaler SHA-256: `{'data_simple_FM_mfcc/data_scaler.pkl': '99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4'}`

Result: **SCALER ARCHIVE FOUND**. The scaler bytes are archived by the experiment DOI and can be pinned for a safe conversion/reproduction step without claiming that pickle deserialization is trusted by default.

No pickle file is deserialized by this workflow. Archive inspection is metadata/hash-only.
