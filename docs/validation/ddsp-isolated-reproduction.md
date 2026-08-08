# Magenta DDSP isolated environment reproduction

Pinned upstream: `magenta/ddsp@cf5e62dfe5d5c80aa14761832233a2e68e840e53`

Code license reviewed: **Apache-2.0**

Environment smoke: **FAILED**

| Stage | Exit |
| --- | ---: |
| toolchain bootstrap | 0 |
| editable install + pinned dependency ranges | 1 |
| base DSP imports | 99 |

Resolved imports: `not resolved`.

This reproduction exercises only the pinned source package and its differentiable core/synth/effect/loss imports. It downloads no pretrained timbre-transfer model, training dataset or model checkpoint. Any such artifact remains blocked until its own immutable hash and reuse license are recorded.

No DDSP runtime is admitted into FM1 Editor by this research smoke.

Environment snapshot:
```text

```

Execution log:
```text
Requirement already satisfied: pip<25 in /tmp/ddsp-venv/lib/python3.9/site-packages (23.0.1)
Collecting pip<25
  Downloading pip-24.3.1-py3-none-any.whl (1.8 MB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.8/1.8 MB 62.2 MB/s eta 0:00:00
Collecting setuptools<76
  Downloading setuptools-75.9.1-py3-none-any.whl (1.2 MB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.2/1.2 MB 158.4 MB/s eta 0:00:00
Collecting wheel
  Downloading wheel-0.47.0-py3-none-any.whl (32 kB)
Collecting packaging>=24.0
  Downloading packaging-26.3-py3-none-any.whl (129 kB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 130.0/130.0 kB 69.5 MB/s eta 0:00:00
Installing collected packages: setuptools, pip, packaging, wheel
  Attempting uninstall: setuptools
    Found existing installation: setuptools 79.0.1
    Uninstalling setuptools-79.0.1:
      Successfully uninstalled setuptools-79.0.1
  Attempting uninstall: pip
    Found existing installation: pip 23.0.1
    Uninstalling pip-23.0.1:
      Successfully uninstalled pip-23.0.1
Successfully installed packaging-26.3 pip-24.3.1 setuptools-75.9.1 wheel-0.47.0
Obtaining file:///tmp/ddsp
  Preparing metadata (setup.py): started
  Preparing metadata (setup.py): finished with status 'done'
Collecting absl-py (from ddsp==3.7.0)
  Downloading absl_py-2.3.1-py3-none-any.whl.metadata (3.3 kB)
Collecting apache-beam (from ddsp==3.7.0)
  Downloading apache_beam-2.69.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (21 kB)
Collecting cloudml-hypertune<=0.1.0.dev6 (from ddsp==3.7.0)
  Downloading cloudml-hypertune-0.1.0.dev6.tar.gz (3.2 kB)
  Preparing metadata (setup.py): started
  Preparing metadata (setup.py): finished with status 'done'
Collecting crepe<=0.0.12 (from ddsp==3.7.0)
  Downloading crepe-0.0.12.tar.gz (15 kB)
  Preparing metadata (setup.py): started
  Preparing metadata (setup.py): finished with status 'done'
Collecting dill<=0.3.4 (from ddsp==3.7.0)
  Downloading dill-0.3.4-py2.py3-none-any.whl.metadata (9.6 kB)
Collecting future (from ddsp==3.7.0)
  Downloading future-1.0.0-py3-none-any.whl.metadata (4.0 kB)
Collecting gin-config>=0.3.0 (from ddsp==3.7.0)
  Downloading gin_config-0.5.0-py3-none-any.whl.metadata (2.9 kB)
Collecting google-cloud-storage (from ddsp==3.7.0)
  Downloading google_cloud_storage-3.9.0-py3-none-any.whl.metadata (15 kB)
Collecting hmmlearn<=0.2.7 (from ddsp==3.7.0)
  Downloading hmmlearn-0.2.7-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl.metadata (2.8 kB)
Collecting librosa<=0.10 (from ddsp==3.7.0)
  Downloading librosa-0.10.0-py3-none-any.whl.metadata (8.3 kB)
Collecting pydub<=0.25.1 (from ddsp==3.7.0)
  Downloading pydub-0.25.1-py2.py3-none-any.whl.metadata (1.4 kB)
Collecting protobuf<=3.20 (from ddsp==3.7.0)
  Downloading protobuf-3.20.0-cp39-cp39-manylinux_2_5_x86_64.manylinux1_x86_64.whl.metadata (698 bytes)
Collecting mir_eval<=0.7 (from ddsp==3.7.0)
  Downloading mir_eval-0.7.tar.gz (90 kB)
  Preparing metadata (setup.py): started
  Preparing metadata (setup.py): finished with status 'done'
Collecting note_seq<0.0.4 (from ddsp==3.7.0)
  Downloading note_seq-0.0.3-py3-none-any.whl.metadata (1.1 kB)
Collecting numpy<1.24 (from ddsp==3.7.0)
  Downloading numpy-1.23.5-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (2.3 kB)
Collecting scipy<=1.10.1 (from ddsp==3.7.0)
  Downloading scipy-1.10.1-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (58 kB)
Collecting six (from ddsp==3.7.0)
  Downloading six-1.17.0-py2.py3-none-any.whl.metadata (1.7 kB)
Collecting tensorflow<=2.11 (from ddsp==3.7.0)
  Downloading tensorflow-2.11.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (3.1 kB)
Collecting tensorflowjs<3.19 (from ddsp==3.7.0)
  Downloading tensorflowjs-3.18.0-py3-none-any.whl.metadata (1.6 kB)
Collecting tensorflow-probability<=0.19 (from ddsp==3.7.0)
  Downloading tensorflow_probability-0.19.0-py2.py3-none-any.whl.metadata (13 kB)
Collecting tensorflow-datasets<=4.9 (from ddsp==3.7.0)
  Downloading tensorflow_datasets-4.9.0-py3-none-any.whl.metadata (9.0 kB)
INFO: pip is looking at multiple versions of ddsp to determine which version is compatible with other requirements. This could take a while.
ERROR: Ignored the following versions that require a different python version: 1.0.0rc0 Requires-Python >=3.12; 1.14.0 Requires-Python >=3.10; 1.14.0rc1 Requires-Python >=3.10; 1.14.0rc2 Requires-Python >=3.10; 1.14.1 Requires-Python >=3.10; 1.15.0 Requires-Python >=3.10; 1.15.0rc1 Requires-Python >=3.10; 1.15.0rc2 Requires-Python >=3.10; 1.15.1 Requires-Python >=3.10; 1.15.2 Requires-Python >=3.10; 1.15.3 Requires-Python >=3.10; 1.16.0 Requires-Python >=3.11; 1.16.0rc1 Requires-Python >=3.11; 1.16.0rc2 Requires-Python >=3.11; 1.16.1 Requires-Python >=3.11; 1.16.2 Requires-Python >=3.11; 1.16.3 Requires-Python >=3.11; 1.17.0 Requires-Python >=3.11; 1.17.0rc1 Requires-Python >=3.11; 1.17.0rc2 Requires-Python >=3.11; 1.17.1 Requires-Python >=3.11; 1.18.0 Requires-Python >=3.12; 1.18.0rc1 Requires-Python >=3.12; 1.18.0rc2 Requires-Python >=3.12; 2.1.0 Requires-Python >=3.10; 2.1.1 Requires-Python >=3.10; 2.1.2 Requires-Python >=3.10; 2.1.3 Requires-Python >=3.10; 2.10.0 Requires-Python >=2.7,<3.0; 2.2.0 Requires-Python >=3.10; 2.2.1 Requires-Python >=3.10; 2.2.2 Requires-Python >=3.10; 2.2.3 Requires-Python >=3.10; 2.2.4 Requires-Python >=3.10; 2.2.5 Requires-Python >=3.10; 2.2.6 Requires-Python >=3.10; 2.3.0 Requires-Python >=2.7,<3.0; 2.3.0 Requires-Python >=3.11; 2.3.1 Requires-Python >=3.11; 2.3.2 Requires-Python >=3.11; 2.3.3 Requires-Python >=3.11; 2.3.4 Requires-Python >=3.11; 2.3.5 Requires-Python >=3.11; 2.4.0 Requires-Python >=2.7,<3.0; 2.4.0 Requires-Python >=3.10; 2.4.0 Requires-Python >=3.11; 2.4.0rc1 Requires-Python >=3.11; 2.4.1 Requires-Python >=3.11; 2.4.2 Requires-Python >=3.11; 2.4.3 Requires-Python >=3.11; 2.4.4 Requires-Python >=3.11; 2.4.5 Requires-Python >=3.11; 2.4.6 Requires-Python >=3.11; 2.5.0 Requires-Python >=2.7,<3.0; 2.5.0 Requires-Python >=3.10; 2.5.0 Requires-Python >=3.12; 2.5.0rc1 Requires-Python >=3.12; 2.5.1 Requires-Python >=3.12; 2.6.0 Requires-Python >=2.7,<3.0; 2.7.0 Requires-Python >=2.7,<3.0; 2.70.0 Requires-Python >=3.10; 2.70.0rc2 Requires-Python >=3.10; 2.70.0rc3 Requires-Python >=3.10; 2.70.0rc4 Requires-Python >=3.10; 2.71.0 Requires-Python >=3.10; 2.71.0rc1 Requires-Python >=3.10; 2.71.0rc3 Requires-Python >=3.10; 2.72.0 Requires-Python >=3.10; 2.72.0rc2 Requires-Python >=3.10; 2.72.0rc5 Requires-Python >=3.10; 2.73.0 Requires-Python >=3.10; 2.73.0rc1 Requires-Python >=3.10; 2.73.0rc2 Requires-Python >=3.10; 2.74.0 Requires-Python >=3.10; 2.74.0rc1 Requires-Python >=3.10; 2.74.0rc2 Requires-Python >=3.10; 2.74.0rc3 Requires-Python >=3.10; 2.75.0 Requires-Python >=3.10; 2.75.0rc1 Requires-Python >=3.10; 2.8.0 Requires-Python >=2.7,<3.0; 2.9.0 Requires-Python >=2.7,<3.0; 3.10.0 Requires-Python >=3.10; 3.10.1 Requires-Python >=3.10; 3.11.0 Requires-Python >=3.10; 3.12.0 Requires-Python >=3.10; 3.12.1 Requires-Python >=3.10; 3.13.0 Requires-Python >=3.10; 3.13.1 Requires-Python >=3.10; 4.9.10 Requires-Python >=3.10; 4.9.4 Requires-Python >=3.10; 4.9.5 Requires-Python >=3.10; 4.9.6 Requires-Python >=3.10; 4.9.7 Requires-Python >=3.10; 4.9.8 Requires-Python >=3.10; 4.9.9 Requires-Python >=3.10; 7.34.0 Requires-Python >=3.10; 7.34.0rc1 Requires-Python >=3.10; 7.34.0rc2 Requires-Python >=3.10; 7.34.1 Requires-Python >=3.10; 7.34.2 Requires-Python >=3.10; 7.35.0 Requires-Python >=3.10; 7.35.0rc1 Requires-Python >=3.10; 7.35.0rc2 Requires-Python >=3.10; 7.35.1 Requires-Python >=3.10; 7.36.0rc1 Requires-Python >=3.10; 7.36.0rc2 Requires-Python >=3.10
ERROR: Could not find a version that satisfies the requirement tflite_support<=0.1 (from ddsp) (from versions: 0.1.0a0.dev3, 0.1.0a0.dev4, 0.1.0a0.dev5, 0.1.0a0, 0.1.0a1, 0.2.0rc0, 0.2.0rc1, 0.2.0, 0.3.0, 0.3.1, 0.4.0rc0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4)

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
ERROR: No matching distribution found for tflite_support<=0.1

```
