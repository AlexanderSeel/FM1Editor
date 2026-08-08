# DDX7 isolated environment reproduction

Pinned upstream: `fcaspe/ddx7@11d04fc16475ff81454f7436f318df9836971a0c`

Code license reviewed: **Apache-2.0**

Environment smoke: **FAILED**

| Stage | Exit |
| --- | ---: |
| pip bootstrap | 0 |
| requirements install | 0 |
| editable install | 0 |
| core imports | 1 |
| train.py --help | 1 |

Resolved core imports: `not resolved`.

This is an isolated Python 3.9 dependency/import/Hydra-entrypoint smoke only. It does not download URMP, train a model, consume a checkpoint or admit DDX7 code/data into FM1 Editor. URMP recordings, torchcrepe/model artifacts and any future checkpoints remain separate provenance/license boundaries.

Resolved environment snapshot:
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
numpy==2.0.2
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
osa>=0.8.0->-r /tmp/ddx7/requirements.txt (line 4))
  Downloading llvmlite-0.43.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (4.8 kB)
Collecting platformdirs>=2.5.0 (from pooch>=1.0->librosa>=0.8.0->-r /tmp/ddx7/requirements.txt (line 4))
  Downloading platformdirs-4.4.0-py3-none-any.whl.metadata (12 kB)
Collecting charset_normalizer<4,>=2 (from requests<3,>=2.21.0->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading charset_normalizer-3.4.9-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (41 kB)
Collecting idna<4,>=2.5 (from requests<3,>=2.21.0->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading idna-3.18-py3-none-any.whl.metadata (6.1 kB)
Collecting urllib3<3,>=1.21.1 (from requests<3,>=2.21.0->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading urllib3-2.6.3-py3-none-any.whl.metadata (6.9 kB)
Collecting certifi>=2017.4.17 (from requests<3,>=2.21.0->tensorboard==2.8.0->-r /tmp/ddx7/requirements.txt (line 7))
  Downloading certifi-2026.7.22-py3-none-any.whl.metadata (2.5 kB)
Collecting threadpoolctl>=3.1.0 (from scikit-learn>=0.19.1->librosa>=0.8.0->-r /tmp/ddx7/requirements.txt (line 4))
  Downloading threadpoolctl-3.6.0-py3-none-any.whl.metadata (13 kB)
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
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.1/1.1 MB 61.7 MB/s eta 0:00:00
Downloading tensorboard-2.8.0-py3-none-any.whl (5.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5.8/5.8 MB 140.0 MB/s eta 0:00:00
Downloading torchcrepe-0.0.16-py3-none-any.whl (72.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 72.3/72.3 MB 24.8 MB/s eta 0:00:00
Downloading librosa-0.9.1-py3-none-any.whl (213 kB)
Downloading h5py-3.7.0-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl (4.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.5/4.5 MB 126.5 MB/s eta 0:00:00
Downloading omegaconf-2.1.2-py3-none-any.whl (74 kB)
Downloading tqdm-4.70.0-py3-none-any.whl (80 kB)
Downloading torch-2.8.0-cp39-cp39-manylinux_2_28_x86_64.whl (888.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 888.0/888.0 MB 48.9 MB/s eta 0:00:00
Downloading nvidia_cublas_cu12-12.8.4.1-py3-none-manylinux_2_27_x86_64.whl (594.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 594.3/594.3 MB 78.1 MB/s eta 0:00:00
Downloading nvidia_cuda_cupti_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (10.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10.2/10.2 MB 179.8 MB/s eta 0:00:00
Downloading nvidia_cuda_nvrtc_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl (88.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 88.0/88.0 MB 212.6 MB/s eta 0:00:00
Downloading nvidia_cuda_runtime_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (954 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 954.8/954.8 kB 176.3 MB/s eta 0:00:00
Downloading nvidia_cudnn_cu12-9.10.2.21-py3-none-manylinux_2_27_x86_64.whl (706.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 706.8/706.8 MB 58.4 MB/s eta 0:00:00
Downloading nvidia_cufft_cu12-11.3.3.83-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (193.1 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 193.1/193.1 MB 166.7 MB/s eta 0:00:00
Downloading nvidia_cufile_cu12-1.13.1.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (1.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.2/1.2 MB 217.9 MB/s eta 0:00:00
Downloading nvidia_curand_cu12-10.3.9.90-py3-none-manylinux_2_27_x86_64.whl (63.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 63.6/63.6 MB 207.5 MB/s eta 0:00:00
Downloading nvidia_cusolver_cu12-11.7.3.90-py3-none-manylinux_2_27_x86_64.whl (267.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 267.5/267.5 MB 96.0 MB/s eta 0:00:00
Downloading nvidia_cusparse_cu12-12.5.8.93-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (288.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 288.2/288.2 MB 154.1 MB/s eta 0:00:00
Downloading nvidia_cusparselt_cu12-0.7.1-py3-none-manylinux2014_x86_64.whl (287.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 287.2/287.2 MB 107.3 MB/s eta 0:00:00
Downloading nvidia_nccl_cu12-2.27.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (322.4 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 322.4/322.4 MB 104.4 MB/s eta 0:00:00
Downloading nvidia_nvjitlink_cu12-12.8.93-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl (39.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 39.3/39.3 MB 192.6 MB/s eta 0:00:00
Downloading nvidia_nvtx_cu12-12.8.90-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (89 kB)
Downloading triton-3.4.0-cp39-cp39-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl (155.4 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 155.4/155.4 MB 221.8 MB/s eta 0:00:00
Downloading torchaudio-2.8.0-cp39-cp39-manylinux_2_28_x86_64.whl (4.0 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.0/4.0 MB 287.1 MB/s eta 0:00:00
Downloading absl_py-2.3.1-py3-none-any.whl (135 kB)
Downloading audioread-3.1.0-py3-none-any.whl (23 kB)
Downloading decorator-5.3.1-py3-none-any.whl (10 kB)
Downloading google_auth-2.50.0-py3-none-any.whl (246 kB)
Downloading google_auth_oauthlib-0.4.6-py2.py3-none-any.whl (18 kB)
Downloading grpcio-1.80.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (6.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6.8/6.8 MB 183.2 MB/s eta 0:00:00
Downloading joblib-1.5.3-py3-none-any.whl (309 kB)
Downloading markdown-3.9-py3-none-any.whl (107 kB)
Downloading numba-0.60.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (3.7 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.7/3.7 MB 170.0 MB/s eta 0:00:00
Downloading numpy-2.0.2-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (19.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 19.5/19.5 MB 242.0 MB/s eta 0:00:00
Downloading packaging-26.3-py3-none-any.whl (129 kB)
Downloading pooch-1.9.0-py3-none-any.whl (67 kB)
Downloading requests-2.32.5-py3-none-any.whl (64 kB)
Downloading resampy-0.4.3-py3-none-any.whl (3.1 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.1/3.1 MB 234.4 MB/s eta 0:00:00
Downloading scikit_learn-1.6.1-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (13.5 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 13.5/13.5 MB 232.4 MB/s eta 0:00:00
Downloading scipy-1.13.1-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (38.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 38.6/38.6 MB 287.1 MB/s eta 0:00:00
Downloading soundfile-0.13.1-py2.py3-none-manylinux_2_28_x86_64.whl (1.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.3/1.3 MB 204.2 MB/s eta 0:00:00
Downloading sympy-1.14.0-py3-none-any.whl (6.3 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6.3/6.3 MB 326.9 MB/s eta 0:00:00
Downloading tensorboard_data_server-0.6.1-py3-none-manylinux2010_x86_64.whl (4.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.9/4.9 MB 199.7 MB/s eta 0:00:00
Downloading tensorboard_plugin_wit-1.8.1-py3-none-any.whl (781 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 781.3/781.3 kB 149.7 MB/s eta 0:00:00
Downloading typing_extensions-4.16.0-py3-none-any.whl (45 kB)
Downloading werkzeug-3.1.8-py3-none-any.whl (226 kB)
Downloading wheel-0.47.0-py3-none-any.whl (32 kB)
Downloading filelock-3.19.1-py3-none-any.whl (15 kB)
Downloading fsspec-2025.10.0-py3-none-any.whl (200 kB)
Downloading jinja2-3.1.6-py3-none-any.whl (134 kB)
Downloading networkx-3.2.1-py3-none-any.whl (1.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.6/1.6 MB 289.0 MB/s eta 0:00:00
Downloading certifi-2026.7.22-py3-none-any.whl (136 kB)
Downloading cffi-2.0.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (216 kB)
Downloading charset_normalizer-3.4.9-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (214 kB)
Downloading cryptography-50.0.0-cp39-abi3-manylinux_2_34_x86_64.whl (4.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.8/4.8 MB 343.4 MB/s eta 0:00:00
Downloading idna-3.18-py3-none-any.whl (65 kB)
Downloading importlib_metadata-8.7.1-py3-none-any.whl (27 kB)
Downloading llvmlite-0.43.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (43.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 43.9/43.9 MB 302.3 MB/s eta 0:00:00
Downloading markupsafe-3.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (20 kB)
Downloading mpmath-1.3.0-py3-none-any.whl (536 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 536.2/536.2 kB 107.1 MB/s eta 0:00:00
Downloading platformdirs-4.4.0-py3-none-any.whl (18 kB)
Downloading pyasn1_modules-0.4.2-py3-none-any.whl (181 kB)
Downloading pyyaml-6.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (750 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 750.8/750.8 kB 158.3 MB/s eta 0:00:00
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
  Created wheel for antlr4-python3-runtime: filename=antlr4_python3_runtime-4.8-py3-none-any.whl size=141246 sha256=6fe8dfec76e15b1e57d5d478e8d7fe620e875f88556895b0a7fd006be2f34bf6
  Stored in directory: /home/runner/.cache/pip/wheels/42/3c/ae/14db087e6018de74810afe32eb6ac890ef9c68ba19b00db97a
Successfully built antlr4-python3-runtime
Installing collected packages: tensorboard-plugin-wit, nvidia-cusparselt-cu12, mpmath, antlr4-python3-runtime, zipp, urllib3, typing-extensions, tqdm, threadpoolctl, tensorboard-data-server, sympy, PyYAML, pycparser, pyasn1, protobuf, platformdirs, packaging, oauthlib, nvidia-nvtx-cu12, nvidia-nvjitlink-cu12, nvidia-nccl-cu12, nvidia-curand-cu12, nvidia-cufile-cu12, nvidia-cuda-runtime-cu12, nvidia-cuda-nvrtc-cu12, nvidia-cuda-cupti-cu12, nvidia-cublas-cu12, numpy, networkx, markupsafe, llvmlite, joblib, idna, fsspec, filelock, decorator, charset_normalizer, certifi, audioread, absl-py, wheel, werkzeug, scipy, requests, pyasn1-modules, omegaconf, nvidia-cusparse-cu12, nvidia-cufft-cu12, nvidia-cudnn-cu12, numba, jinja2, importlib-metadata, h5py, grpcio, cffi, triton, soundfile, scikit-learn, resampy, requests-oauthlib, pooch, nvidia-cusolver-cu12, markdown, hydra-core, cryptography, torch, librosa, google-auth, torchcrepe, torchaudio, google-auth-oauthlib, tensorboard
Successfully installed PyYAML-6.0.3 absl-py-2.3.1 antlr4-python3-runtime-4.8 audioread-3.1.0 certifi-2026.7.22 cffi-2.0.0 charset_normalizer-3.4.9 cryptography-50.0.0 decorator-5.3.1 filelock-3.19.1 fsspec-2025.10.0 google-auth-2.50.0 google-auth-oauthlib-0.4.6 grpcio-1.80.0 h5py-3.7.0 hydra-core-1.1.1 idna-3.18 importlib-metadata-8.7.1 jinja2-3.1.6 joblib-1.5.3 librosa-0.9.1 llvmlite-0.43.0 markdown-3.9 markupsafe-3.0.3 mpmath-1.3.0 networkx-3.2.1 numba-0.60.0 numpy-2.0.2 nvidia-cublas-cu12-12.8.4.1 nvidia-cuda-cupti-cu12-12.8.90 nvidia-cuda-nvrtc-cu12-12.8.93 nvidia-cuda-runtime-cu12-12.8.90 nvidia-cudnn-cu12-9.10.2.21 nvidia-cufft-cu12-11.3.3.83 nvidia-cufile-cu12-1.13.1.3 nvidia-curand-cu12-10.3.9.90 nvidia-cusolver-cu12-11.7.3.90 nvidia-cusparse-cu12-12.5.8.93 nvidia-cusparselt-cu12-0.7.1 nvidia-nccl-cu12-2.27.3 nvidia-nvjitlink-cu12-12.8.93 nvidia-nvtx-cu12-12.8.90 oauthlib-3.3.1 omegaconf-2.1.2 packaging-26.3 platformdirs-4.4.0 pooch-1.9.0 protobuf-3.19.4 pyasn1-0.6.4 pyasn1-modules-0.4.2 pycparser-2.23 requests-2.32.5 requests-oauthlib-2.0.0 resampy-0.4.3 scikit-learn-1.6.1 scipy-1.13.1 soundfile-0.13.1 sympy-1.14.0 tensorboard-2.8.0 tensorboard-data-server-0.6.1 tensorboard-plugin-wit-1.8.1 threadpoolctl-3.6.0 torch-2.8.0 torchaudio-2.8.0 torchcrepe-0.0.16 tqdm-4.70.0 triton-3.4.0 typing-extensions-4.16.0 urllib3-2.6.3 werkzeug-3.1.8 wheel-0.47.0 zipp-3.23.1

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
Traceback (most recent call last):
  File "<stdin>", line 5, in <module>
  File "/opt/hostedtoolcache/Python/3.9.25/x64/lib/python3.9/importlib/__init__.py", line 127, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
  File "<frozen importlib._bootstrap>", line 1030, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1007, in _find_and_load
  File "<frozen importlib._bootstrap>", line 986, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 680, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 850, in exec_module
  File "<frozen importlib._bootstrap>", line 228, in _call_with_frames_removed
  File "/tmp/ddx7-venv/lib/python3.9/site-packages/h5py/__init__.py", line 25, in <module>
    from . import _errors
  File "h5py/_errors.pyx", line 1, in init h5py._errors
ValueError: numpy.dtype size changed, may indicate binary incompatibility. Expected 96 from C header, got 88 from PyObject
Traceback (most recent call last):
  File "/tmp/ddx7/train.py", line 1, in <module>
    from trainer import Trainer
  File "/tmp/ddx7/trainer.py", line 3, in <module>
    import h5py
  File "/tmp/ddx7-venv/lib/python3.9/site-packages/h5py/__init__.py", line 25, in <module>
    from . import _errors
  File "h5py/_errors.pyx", line 1, in init h5py._errors
ValueError: numpy.dtype size changed, may indicate binary incompatibility. Expected 96 from C header, got 88 from PyObject

```
