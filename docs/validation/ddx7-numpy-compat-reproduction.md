# DDX7 NumPy-ABI compatibility reproduction

Pinned upstream: `fcaspe/ddx7@11d04fc16475ff81454f7436f318df9836971a0c`

Code license: **Apache-2.0**

Compatibility smoke: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| pip bootstrap | 0 |
| NumPy 1.23.5 constraint | 0 |
| upstream requirements | 0 |
| NumPy/h5py ABI reinstall | 0 |
| editable install | 0 |
| core imports | 0 |
| train.py --help | 0 |

Resolved core imports: `{"h5py": "3.7.0", "hydra": "1.1.1", "librosa": "0.9.1", "numpy": "1.23.5", "torch": "2.8.0+cu128", "torchaudio": "2.8.0+cu128", "torchcrepe": "imported"}`.

The only intentional compatibility constraint is `numpy==1.23.5` plus reinstalling the upstream-pinned `h5py==3.7.0`; DDX7 source is not modified. This tests whether the first reproduction failure was solely NumPy-2 ABI drift. It still downloads no URMP data, uses no checkpoint and admits no DDX7 runtime into FM1 Editor.

Environment snapshot:
```text
-e git+https://github.com/fcaspe/ddx7.git@11d04fc16475ff81454f7436f318df9836971a0c#egg=ddx7
Jinja2==3.1.6
Markdown==3.9
MarkupSafe==3.0.3
PyYAML==6.0.3
Werkzeug==3.1.8
absl-py==2.3.1
antlr4-python3-runtime==4.8
audioread==3.1.0
certifi==2026.7.22
cffi==2.0.0
charset-normalizer==3.4.9
cryptography==50.0.0
decorator==5.3.1
filelock==3.19.1
fsspec==2025.10.0
google-auth-oauthlib==0.4.6
google-auth==2.50.0
grpcio==1.80.0
h5py==3.7.0
hydra-core==1.1.1
idna==3.18
importlib_metadata==8.7.1
joblib==1.5.3
librosa==0.9.1
llvmlite==0.43.0
mpmath==1.3.0
networkx==3.2.1
numba==0.60.0
numpy==1.23.5
nvidia-cublas-cu12==12.8.4.1
nvidia-cuda-cupti-cu12==12.8.90
nvidia-cuda-nvrtc-cu12==12.8.93
nvidia-cuda-runtime-cu12==12.8.90
nvidia-cudnn-cu12==9.10.2.21
nvidia-cufft-cu12==11.3.3.83
nvidia-cufile-cu12==1.13.1.3
nvidia-curand-cu12==10.3.9.90
nvidia-cusolver-cu12==11.7.3.90
nvidia-cusparse-cu12==12.5.8.93
nvidia-cusparselt-cu12==0.7.1
nvidia-nccl-cu12==2.27.3
nvidia-nvjitlink-cu12==12.8.93
nvidia-nvtx-cu12==12.8.90
oauthlib==3.3.1
omegaconf==2.1.2
packaging==26.3
platformdirs==4.4.0
pooch==1.9.0
protobuf==3.19.4
pyasn1==0.6.4
pyasn1_modules==0.4.2
pycparser==2.23
requests-oauthlib==2.0.0
requests==2.32.5
resampy==0.4.3
scikit-learn==1.6.1
scipy==1.13.1
soundfile==0.13.1
sympy==1.14.0
tensorboard-data-server==0.6.1
tensorboard-plugin-wit==1.8.1
tensorboard==2.8.0
threadpoolctl==3.6.0
torch==2.8.0
torchaudio==2.8.0
torchcrepe==0.0.16
tqdm==4.70.0
triton==3.4.0
typing_extensions==4.16.0
urllib3==2.6.3
zipp==3.23.1

```

Execution log:
```text
olctl-3.6.0-py3-none-any.whl.metadata (13 kB)
Collecting cffi>=1.0 (from soundfile>=0.10.2->librosa>=0.8.0->-r /tmp/ddx7/requirements.txt (line 4))
  Downloading cffi-2.0.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl.metadata (2.6 kB)
Collecting mpmath<1.4,>=1.1.0 (from sympy>=1.13.3->torch>=1.7.0->-r /tmp/ddx7/requirements.txt (line 2))
  Downloading mpmath-1.3.0-py3-none-any.whl.metadata (8.6 kB)
Collecting markupsafe>=2.1.1 (from werkzeug>=0.11.15->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading markupsafe-3.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (2.7 kB)
Collecting pycparser (from cffi>=1.0->soundfile>=0.10.2->librosa>=0.8.0->-r /tmp/ddx7/requirements.txt (line 4))
  Downloading pycparser-2.23-py3-none-any.whl.metadata (993 bytes)
Collecting zipp>=3.20 (from importlib-metadata->triton==3.4.0->torch>=1.7.0->-r /tmp/ddx7/requirements.txt (line 2))
  Downloading zipp-3.23.1-py3-none-any.whl.metadata (3.6 kB)
Collecting pyasn1<0.7.0,>=0.6.1 (from pyasn1-modules>=0.2.1->google-auth<3,>=1.6.3->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading pyasn1-0.6.4-py3-none-any.whl.metadata (8.4 kB)
Collecting oauthlib>=3.0.0 (from requests-oauthlib>=0.7.0->google-auth-oauthlib<0.5,>=0.4.1->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading oauthlib-3.3.1-py3-none-any.whl.metadata (7.9 kB)
Downloading hydra_core-1.1.1-py3-none-any.whl (145 kB)
Downloading protobuf-3.19.4-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (1.1 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.1/1.1 MB 121.3 MB/s eta 0:00:00
Downloading tensorboard-2.8.0-py3-none-any.whl (5.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5.8/5.8 MB 34.9 MB/s eta 0:00:00
Downloading torchcrepe-0.0.16-py3-none-any.whl (72.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 72.3/72.3 MB 11.1 MB/s eta 0:00:00
Downloading librosa-0.9.1-py3-none-any.whl (213 kB)
Downloading h5py-3.7.0-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl (4.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.5/4.5 MB 24.0 MB/s eta 0:00:00
Downloading omegaconf-2.1.2-py3-none-any.whl (74 kB)
Downloading tqdm-4.70.0-py3-none-any.whl (80 kB)
Downloading torch-2.8.0-cp39-cp39-manylinux_2_28_x86_64.whl (888.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 888.0/888.0 MB 50.1 MB/s eta 0:00:00
Downloading nvidia_cublas_cu12-12.8.4.1-py3-none-manylinux_2_27_x86_64.whl (594.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 594.3/594.3 MB 60.2 MB/s eta 0:00:00
Downloading nvidia_cuda_cupti_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (10.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10.2/10.2 MB 190.6 MB/s eta 0:00:00
Downloading nvidia_cuda_nvrtc_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl (88.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 88.0/88.0 MB 119.4 MB/s eta 0:00:00
Downloading nvidia_cuda_runtime_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (954 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 954.8/954.8 kB 164.8 MB/s eta 0:00:00
Downloading nvidia_cudnn_cu12-9.10.2.21-py3-none-manylinux_2_27_x86_64.whl (706.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 706.8/706.8 MB 50.7 MB/s eta 0:00:00
Downloading nvidia_cufft_cu12-11.3.3.83-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (193.1 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 193.1/193.1 MB 127.0 MB/s eta 0:00:00
Downloading nvidia_cufile_cu12-1.13.1.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (1.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.2/1.2 MB 198.1 MB/s eta 0:00:00
Downloading nvidia_curand_cu12-10.3.9.90-py3-none-manylinux_2_27_x86_64.whl (63.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 63.6/63.6 MB 210.0 MB/s eta 0:00:00
Downloading nvidia_cusolver_cu12-11.7.3.90-py3-none-manylinux_2_27_x86_64.whl (267.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 267.5/267.5 MB 121.3 MB/s eta 0:00:00
Downloading nvidia_cusparse_cu12-12.5.8.93-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (288.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 288.2/288.2 MB 97.7 MB/s eta 0:00:00
Downloading nvidia_cusparselt_cu12-0.7.1-py3-none-manylinux2014_x86_64.whl (287.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 287.2/287.2 MB 67.8 MB/s eta 0:00:00
Downloading nvidia_nccl_cu12-2.27.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (322.4 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 322.4/322.4 MB 137.5 MB/s eta 0:00:00
Downloading nvidia_nvjitlink_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl (39.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 39.3/39.3 MB 211.0 MB/s eta 0:00:00
Downloading nvidia_nvtx_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (89 kB)
Downloading triton-3.4.0-cp39-cp39-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl (155.4 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 155.4/155.4 MB 137.6 MB/s eta 0:00:00
Downloading torchaudio-2.8.0-cp39-cp39-manylinux_2_28_x86_64.whl (4.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.0/4.0 MB 156.6 MB/s eta 0:00:00
Downloading absl_py-2.3.1-py3-none-any.whl (135 kB)
Downloading audioread-3.1.0-py3-none-any.whl (23 kB)
Downloading decorator-5.3.1-py3-none-any.whl (10 kB)
Downloading google_auth-2.50.0-py3-none-any.whl (246 kB)
Downloading google_auth_oauthlib-0.4.6-py2.py3-none-any.whl (18 kB)
Downloading grpcio-1.80.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (6.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6.8/6.8 MB 253.8 MB/s eta 0:00:00
Downloading joblib-1.5.3-py3-none-any.whl (309 kB)
Downloading markdown-3.9-py3-none-any.whl (107 kB)
Downloading numba-0.60.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (3.7 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.7/3.7 MB 170.4 MB/s eta 0:00:00
Downloading packaging-26.3-py3-none-any.whl (129 kB)
Downloading pooch-1.9.0-py3-none-any.whl (67 kB)
Downloading requests-2.32.5-py3-none-any.whl (64 kB)
Downloading resampy-0.4.3-py3-none-any.whl (3.1 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.1/3.1 MB 188.5 MB/s eta 0:00:00
Downloading scikit_learn-1.6.1-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (13.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 13.5/13.5 MB 213.2 MB/s eta 0:00:00
Downloading scipy-1.13.1-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (38.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 38.6/38.6 MB 187.0 MB/s eta 0:00:00
Downloading soundfile-0.13.1-py2.py3-none-manylinux_2_28_x86_64.whl (1.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.3/1.3 MB 202.9 MB/s eta 0:00:00
Downloading sympy-1.14.0-py3-none-any.whl (6.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6.3/6.3 MB 275.6 MB/s eta 0:00:00
Downloading tensorboard_data_server-0.6.1-py3-none-manylinux2010_x86_64.whl (4.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.9/4.9 MB 116.3 MB/s eta 0:00:00
Downloading tensorboard_plugin_wit-1.8.1-py3-none-any.whl (781 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 781.3/781.3 kB 136.3 MB/s eta 0:00:00
Downloading typing_extensions-4.16.0-py3-none-any.whl (45 kB)
Downloading werkzeug-3.1.8-py3-none-any.whl (226 kB)
Downloading wheel-0.47.0-py3-none-any.whl (32 kB)
Downloading filelock-3.19.1-py3-none-any.whl (15 kB)
Downloading fsspec-2025.10.0-py3-none-any.whl (200 kB)
Downloading jinja2-3.1.6-py3-none-any.whl (134 kB)
Downloading networkx-3.2.1-py3-none-any.whl (1.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.6/1.6 MB 229.1 MB/s eta 0:00:00
Downloading certifi-2026.7.22-py3-none-any.whl (136 kB)
Downloading cffi-2.0.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (216 kB)
Downloading charset_normalizer-3.4.9-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (214 kB)
Downloading cryptography-50.0.0-cp39-abi3-manylinux_2_34_x86_64.whl (4.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.8/4.8 MB 275.3 MB/s eta 0:00:00
Downloading idna-3.18-py3-none-any.whl (65 kB)
Downloading importlib_metadata-8.7.1-py3-none-any.whl (27 kB)
Downloading llvmlite-0.43.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (43.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 43.9/43.9 MB 116.7 MB/s eta 0:00:00
Downloading markupsafe-3.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (20 kB)
Downloading mpmath-1.3.0-py3-none-any.whl (536 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 536.2/536.2 kB 95.5 MB/s eta 0:00:00
Downloading platformdirs-4.4.0-py3-none-any.whl (18 kB)
Downloading pyasn1_modules-0.4.2-py3-none-any.whl (181 kB)
Downloading pyyaml-6.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (750 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 750.8/750.8 kB 144.5 MB/s eta 0:00:00
Downloading requests_oauthlib-2.0.0-py2.py3-none-any.whl (24 kB)
Downloading threadpoolctl-3.6.0-py3-none-any.whl (18 kB)
Downloading urllib3-2.6.3-py3-none-any.whl (131 kB)
Downloading oauthlib-3.3.1-py3-none-any.whl (160 kB)
Downloading pyasn1-0.6.4-py3-none-any.whl (84 kB)
Downloading zipp-3.23.1-py3-none-any.whl (10 kB)
Downloading pycparser-2.23-py3-none-any.whl (118 kB)
Building wheels for collected packages: antlr4-python3-runtime
  Building wheel for antlr4-python3-runtime (pyproject.toml): started
  Building wheel for antlr4-python3-runtime (pyproject.toml): finished with status 'done'
  Created wheel for antlr4-python3-runtime: filename=antlr4_python3_runtime-4.8-py3-none-any.whl size=141246 sha256=4695e69fe3ca64023f8ee23827cb5bdaec9563cc6b6bf0aa1c128eb096fa6338
  Stored in directory: /home/runner/.cache/pip/wheels/42/3c/ae/14db087e6018de74810afe32eb6ac890ef9c68ba19b00db97a
Successfully built antlr4-python3-runtime
Installing collected packages: tensorboard-plugin-wit, nvidia-cusparselt-cu12, mpmath, antlr4-python3-runtime, zipp, urllib3, typing-extensions, tqdm, threadpoolctl, tensorboard-data-server, sympy, scipy, PyYAML, pycparser, pyasn1, protobuf, platformdirs, packaging, oauthlib, nvidia-nvtx-cu12, nvidia-nvjitlink-cu12, nvidia-nccl-cu12, nvidia-curand-cu12, nvidia-cufile-cu12, nvidia-cuda-runtime-cu12, nvidia-cuda-nvrtc-cu12, nvidia-cuda-cupti-cu12, nvidia-cublas-cu12, networkx, markupsafe, llvmlite, joblib, idna, h5py, fsspec, filelock, decorator, charset_normalizer, certifi, audioread, absl-py, wheel, werkzeug, scikit-learn, requests, pyasn1-modules, omegaconf, nvidia-cusparse-cu12, nvidia-cufft-cu12, nvidia-cudnn-cu12, numba, jinja2, importlib-metadata, grpcio, cffi, triton, soundfile, resampy, requests-oauthlib, pooch, nvidia-cusolver-cu12, markdown, hydra-core, cryptography, torch, librosa, google-auth, torchcrepe, torchaudio, google-auth-oauthlib, tensorboard
Successfully installed PyYAML-6.0.3 absl-py-2.3.1 antlr4-python3-runtime-4.8 audioread-3.1.0 certifi-2026.7.22 cffi-2.0.0 charset_normalizer-3.4.9 cryptography-50.0.0 decorator-5.3.1 filelock-3.19.1 fsspec-2025.10.0 google-auth-2.50.0 google-auth-oauthlib-0.4.6 grpcio-1.80.0 h5py-3.7.0 hydra-core-1.1.1 idna-3.18 importlib-metadata-8.7.1 jinja2-3.1.6 joblib-1.5.3 librosa-0.9.1 llvmlite-0.43.0 markdown-3.9 markupsafe-3.0.3 mpmath-1.3.0 networkx-3.2.1 numba-0.60.0 nvidia-cublas-cu12-12.8.4.1 nvidia-cuda-cupti-cu12-12.8.90 nvidia-cuda-nvrtc-cu12-12.8.93 nvidia-cuda-runtime-cu12-12.8.90 nvidia-cudnn-cu12-9.10.2.21 nvidia-cufft-cu12-11.3.3.83 nvidia-cufile-cu12-1.13.1.3 nvidia-curand-cu12-10.3.9.90 nvidia-cusolver-cu12-11.7.3.90 nvidia-cusparse-cu12-12.5.8.93 nvidia-cusparselt-cu12-0.7.1 nvidia-nccl-cu12-2.27.3 nvidia-nvjitlink-cu12-12.8.93 nvidia-nvtx-cu12-12.8.90 oauthlib-3.3.1 omegaconf-2.1.2 packaging-26.3 platformdirs-4.4.0 pooch-1.9.0 protobuf-3.19.4 pyasn1-0.6.4 pyasn1-modules-0.4.2 pycparser-2.23 requests-2.32.5 requests-oauthlib-2.0.0 resampy-0.4.3 scikit-learn-1.6.1 scipy-1.13.1 soundfile-0.13.1 sympy-1.14.0 tensorboard-2.8.0 tensorboard-data-server-0.6.1 tensorboard-plugin-wit-1.8.1 threadpoolctl-3.6.0 torch-2.8.0 torchaudio-2.8.0 torchcrepe-0.0.16 tqdm-4.70.0 triton-3.4.0 typing-extensions-4.16.0 urllib3-2.6.3 werkzeug-3.1.8 wheel-0.47.0 zipp-3.23.1

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
Collecting numpy==1.23.5
  Using cached numpy-1.23.5-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (2.3 kB)
Collecting h5py==3.7.0
  Using cached h5py-3.7.0-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl.metadata (1.8 kB)
Using cached numpy-1.23.5-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (17.1 MB)
Using cached h5py-3.7.0-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl (4.5 MB)
Installing collected packages: numpy, h5py
  Attempting uninstall: numpy
    Found existing installation: numpy 1.23.5
    Uninstalling numpy-1.23.5:
      Successfully uninstalled numpy-1.23.5
  Attempting uninstall: h5py
    Found existing installation: h5py 3.7.0
    Uninstalling h5py-3.7.0:
      Successfully uninstalled h5py-3.7.0
Successfully installed h5py-3.7.0 numpy-1.23.5

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
Obtaining file:///tmp/ddx7
  Preparing metadata (setup.py): started
  Preparing metadata (setup.py): finished with status 'done'
Installing collected packages: ddx7
  DEPRECATION: Legacy editable install of ddx7==0.1 from file:///tmp/ddx7 (setup.py develop) is deprecated. pip 25.0 will enforce this behaviour change. A possible replacement is to add a pyproject.toml or enable --use-pep517, and use setuptools >= 64. If the resulting installation is not behaving as expected, try using --config-settings editable_mode=compat. Please consult the setuptools documentation for more information. Discussion can be found at https://github.com/pypa/pip/issues/11457
  Running setup.py develop for ddx7
Successfully installed ddx7

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
DDX7_COMPAT_IMPORTS={"h5py": "3.7.0", "hydra": "1.1.1", "librosa": "0.9.1", "numpy": "1.23.5", "torch": "2.8.0+cu128", "torchaudio": "2.8.0+cu128", "torchcrepe": "imported"}
/tmp/ddx7-venv/lib/python3.9/site-packages/hydra/_internal/defaults_list.py:251: UserWarning: In 'config.yaml': Defaults list is missing `_self_`. See https://hydra.cc/docs/upgrades/1.0_to_1.1/default_composition_order for more information
  warnings.warn(msg, UserWarning)
train is powered by Hydra.

== Configuration groups ==
Compose your configuration from those groups (group=option)

hyperparams: ddx7, hpn
model: hpn_baseline, tcnres_f0ld_fm1stack2, tcnres_f0ld_fm1stack4, tcnres_f0ld_fm2stack2, tcnres_f0ld_fmablbrass, tcnres_f0ld_fmablflute, tcnres_f0ld_fmbrss, tcnres_f0ld_fmflt, tcnres_f0ld_fmstr


== Config ==
Override anything in the config (foo.bar=value)

hyperparams:
  _target_: trainer.Hyperparams
  steps: 120000
  loss_fn:
    _target_: ddx7.loss_functions.rec_loss
    scales:
    - 2048
    - 1024
    - 512
    - 256
    - 128
    - 64
    overlap: 0.75
  scheduler: ExponentialLR
  opt: Adam
  lr: 0.0003
  lr_decay_rate: 0.98
  lr_decay_steps: 10000
  grad_clip_norm: 2.0
  batch_size: 16
  n_store_best: 20
model:
  _target_: ddx7.models.DDSP_Decoder
  decoder:
    _target_: ddx7.models.TCNFMDecoder
    n_blocks: 5
    hidden_channels: 128
    out_channels: 6
    kernel_size: 3
    dilation_base: 2
    apply_padding: true
    deploy_residual: true
    input_keys:
    - f0_scaled
    - loudness_scaled
  synth:
    _target_: ddx7.synth.FMSynth
    sample_rate: 16000
    block_size: 64
    max_ol: 0.32
    fr:
    - 1
    - 1
    - 1
    - 1
    - 3
    - 14
    synth_module: fmstrings
instrument: violin
device: cuda:0
mode: train
data_dir: dataset/data
load_additional_testset: false
seed: 1234
train_split: 0.75
resume_epoch: 0
run_dir: runs
exp_name: exp_test
run_name: testrun


Powered by Hydra (https://hydra.cc)
Use --hydra-help to view Hydra specific help



```
