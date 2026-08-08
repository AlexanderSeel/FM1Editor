# Magenta DDSP isolated environment reproduction

Pinned upstream: `magenta/ddsp@cf5e62dfe5d5c80aa14761832233a2e68e840e53`

Code license reviewed: **Apache-2.0**

Environment smoke: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| compatible toolchain bootstrap | 0 |
| editable install with prerelease resolution | 0 |
| base DSP imports | 0 |

Resolved imports: `{"core": true, "ddsp": "3.7.0", "effects": true, "losses": true, "numpy": "1.23.5", "packaging": "20.9", "processors": true, "setuptools": "65.5.1", "spectral_ops": true, "synths": true, "tensorflow": "2.11.0", "tensorflow_probability": "0.19.0", "tflite_support": "0.1.0a1"}`.

Reproduction constraints: the pinned setup requires `tflite_support<=0.1`, whose matching package-index releases are prereleases, and its legacy editable-install path is incompatible with the modern setuptools/packaging combination observed in the first rerun. This receipt permits prereleases and pins setuptools 65.5.1 plus wheel 0.38.4; DDSP source is not modified.

This reproduction exercises the pinned source package and its differentiable core/synth/effect/loss imports. It downloads no pretrained timbre-transfer model, training dataset or model checkpoint. Any such artifact remains blocked until its own immutable hash and reuse license are recorded.

No DDSP runtime, model, dataset or preprocessing is admitted into FM1 Editor by this research smoke.

Environment snapshot:
```text
-e git+https://github.com/magenta/ddsp.git@cf5e62dfe5d5c80aa14761832233a2e68e840e53#egg=ddsp
ImageIO==2.37.2
Jinja2==3.1.6
Markdown==3.9
MarkupSafe==3.0.3
PyYAML==6.0.3
Pygments==2.20.0
Werkzeug==3.1.8
absl-py==1.4.0
apache-beam==2.46.0
array_record==0.5.1
asttokens==3.0.2
astunparse==1.6.3
attrs==26.1.0
audioread==3.1.0
bokeh==3.4.3
certifi==2026.7.22
cffi==2.0.0
charset-normalizer==3.4.9
click==8.1.8
cloudml-hypertune==0.1.0.dev6
cloudpickle==2.2.1
contourpy==1.3.0
crcmod==1.7
crepe==0.0.12
cryptography==50.0.0
cycler==0.12.1
decorator==5.3.1
dill==0.3.1.1
dm-tree==0.1.8
docopt==0.6.2
etils==1.5.2
exceptiongroup==1.3.1
executing==2.2.1
fastavro==1.12.2
fasteners==0.20
flatbuffers==25.12.19
fonttools==4.60.2
fsspec==2025.10.0
future==1.0.0
gast==0.4.0
gin-config==0.5.0
google-api-core==2.29.0
google-auth-oauthlib==0.4.6
google-auth==2.50.0
google-cloud-core==2.5.1
google-cloud-storage==3.9.0
google-crc32c==1.8.0
google-pasta==0.2.0
google-resumable-media==2.8.2
googleapis-common-protos==1.63.1
grpcio==1.80.0
h5py==3.14.0
hdfs==2.7.3
hmmlearn==0.2.7
httplib2==0.21.0
idna==3.18
importlib_metadata==8.7.1
importlib_resources==6.5.2
intervaltree==3.2.1
ipython==8.18.1
jedi==0.19.2
joblib==1.5.3
keras==2.11.0
kiwisolver==1.4.7
lazy-loader==0.5
libclang==18.1.1
librosa==0.10.0
llvmlite==0.43.0
matplotlib-inline==0.2.2
matplotlib==3.9.4
mido==1.3.3
mir-eval==0.7
msgpack==1.1.2
note-seq==0.0.3
numba==0.60.0
numpy==1.23.5
oauthlib==3.3.1
objsize==0.6.1
opt_einsum==3.4.0
orjson==3.11.5
packaging==20.9
pandas==2.3.3
parso==0.8.7
pexpect==4.9.0
pillow==11.3.0
platformdirs==4.4.0
pooch==1.9.0
pretty_midi==0.2.11.post0
promise==2.3
prompt_toolkit==3.0.52
proto-plus==1.27.1
protobuf==3.19.6
psutil==7.2.2
ptyprocess==0.7.0
pure_eval==0.2.3
pyarrow==9.0.0
pyasn1==0.6.4
pyasn1_modules==0.4.2
pybind11==3.1.0
pycparser==2.23
pydot==1.4.2
pydub==0.25.1
pymongo==3.13.0
pyparsing==3.3.2
python-dateutil==2.9.0.post0
pytz==2026.3.post1
regex==2026.1.15
requests-oauthlib==2.0.0
requests==2.32.5
resampy==0.2.2
scikit-learn==1.6.1
scipy==1.10.1
six==1.17.0
sortedcontainers==2.4.0
soundfile==0.13.1
soxr==1.1.0
stack-data==0.6.3
tensorboard-data-server==0.6.1
tensorboard-plugin-wit==1.8.1
tensorboard==2.11.2
tensorflow-datasets==4.9.0
tensorflow-estimator==2.11.0
tensorflow-hub==0.12.0
tensorflow-io-gcs-filesystem==0.37.1
tensorflow-metadata==1.13.0
tensorflow-probability==0.19.0
tensorflow==2.11.0
tensorflowjs==3.18.0
termcolor==3.1.0
tflite-support==0.1.0a1
threadpoolctl==3.6.0
toml==0.10.2
tornado==6.5.8
tqdm==4.70.0
traitlets==5.15.1
typing_extensions==4.16.0
tzdata==2026.3
urllib3==2.6.3
wcwidth==0.8.2
wrapt==2.4.0rc1
xyzservices==2026.3.0
zipp==3.23.1
zstandard==0.25.0

```

Execution log:
```text
.1-1-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (2.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.2/2.2 MB 5.2 MB/s eta 0:00:00
Downloading attrs-26.1.0-py3-none-any.whl (67 kB)
Downloading click-8.1.8-py3-none-any.whl (98 kB)
Downloading dm_tree-0.1.8-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (153 kB)
Downloading ipython-8.18.1-py3-none-any.whl (808 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 808.2/808.2 kB 178.5 MB/s eta 0:00:00
Downloading psutil-7.2.2-cp36-abi3-manylinux2010_x86_64.manylinux_2_12_x86_64.manylinux_2_28_x86_64.whl (155 kB)
Downloading tensorflow_metadata-1.13.0-py3-none-any.whl (53 kB)
Downloading absl_py-1.4.0-py3-none-any.whl (126 kB)
Downloading toml-0.10.2-py2.py3-none-any.whl (16 kB)
Downloading tqdm-4.70.0-py3-none-any.whl (80 kB)
Downloading certifi-2026.7.22-py3-none-any.whl (136 kB)
Downloading cffi-2.0.0-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (216 kB)
Downloading charset_normalizer-3.4.9-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (214 kB)
Downloading contourpy-1.3.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (321 kB)
Downloading cryptography-50.0.0-cp39-abi3-manylinux_2_34_x86_64.whl (4.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.8/4.8 MB 349.2 MB/s eta 0:00:00
Downloading cycler-0.12.1-py3-none-any.whl (8.3 kB)
Downloading fonttools-4.60.2-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (4.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.8/4.8 MB 115.2 MB/s eta 0:00:00
Downloading google_auth_oauthlib-0.4.6-py2.py3-none-any.whl (18 kB)
Downloading googleapis_common_protos-1.63.1-py2.py3-none-any.whl (229 kB)
Downloading idna-3.18-py3-none-any.whl (65 kB)
Downloading importlib_resources-6.5.2-py3-none-any.whl (37 kB)
Downloading jedi-0.19.2-py2.py3-none-any.whl (1.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.6/1.6 MB 271.2 MB/s eta 0:00:00
Downloading jinja2-3.1.6-py3-none-any.whl (134 kB)
Downloading kiwisolver-1.4.7-cp39-cp39-manylinux_2_12_x86_64.manylinux2010_x86_64.whl (1.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.6/1.6 MB 149.4 MB/s eta 0:00:00
Downloading llvmlite-0.43.0-cp39-cp39-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (43.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 43.9/43.9 MB 132.2 MB/s eta 0:00:00
Downloading markdown-3.9-py3-none-any.whl (107 kB)
Downloading mido-1.3.3-py3-none-any.whl (54 kB)
Downloading pexpect-4.9.0-py2.py3-none-any.whl (63 kB)
Downloading pillow-11.3.0-cp39-cp39-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl (6.6 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6.6/6.6 MB 226.4 MB/s eta 0:00:00
Downloading platformdirs-4.4.0-py3-none-any.whl (18 kB)
Downloading prompt_toolkit-3.0.52-py3-none-any.whl (391 kB)
Downloading pyasn1_modules-0.4.2-py3-none-any.whl (181 kB)
Downloading pygments-2.20.0-py3-none-any.whl (1.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.2/1.2 MB 202.9 MB/s eta 0:00:00
Downloading pyparsing-3.3.2-py3-none-any.whl (122 kB)
Downloading pyyaml-6.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (750 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 750.8/750.8 kB 144.6 MB/s eta 0:00:00
Downloading tensorboard_data_server-0.6.1-py3-none-manylinux2010_x86_64.whl (4.9 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.9/4.9 MB 179.7 MB/s eta 0:00:00
Downloading tensorboard_plugin_wit-1.8.1-py3-none-any.whl (781 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 781.3/781.3 kB 145.8 MB/s eta 0:00:00
Downloading threadpoolctl-3.6.0-py3-none-any.whl (18 kB)
Downloading tornado-6.5.8-cp39-abi3-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl (450 kB)
Downloading traitlets-5.15.1-py3-none-any.whl (85 kB)
Downloading tzdata-2026.3-py2.py3-none-any.whl (348 kB)
Downloading urllib3-2.6.3-py3-none-any.whl (131 kB)
Downloading werkzeug-3.1.8-py3-none-any.whl (226 kB)
Downloading xyzservices-2026.3.0-py3-none-any.whl (94 kB)
Downloading zipp-3.23.1-py3-none-any.whl (10 kB)
Downloading exceptiongroup-1.3.1-py3-none-any.whl (16 kB)
Downloading fsspec-2025.10.0-py3-none-any.whl (200 kB)
Downloading matplotlib_inline-0.2.2-py3-none-any.whl (9.5 kB)
Downloading sortedcontainers-2.4.0-py2.py3-none-any.whl (29 kB)
Downloading stack_data-0.6.3-py3-none-any.whl (24 kB)
Downloading asttokens-3.0.2-py3-none-any.whl (28 kB)
Downloading executing-2.2.1-py2.py3-none-any.whl (28 kB)
Downloading importlib_metadata-8.7.1-py3-none-any.whl (27 kB)
Downloading markupsafe-3.0.3-cp39-cp39-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (20 kB)
Downloading parso-0.8.7-py2.py3-none-any.whl (107 kB)
Downloading ptyprocess-0.7.0-py2.py3-none-any.whl (13 kB)
Downloading pyasn1-0.6.4-py3-none-any.whl (84 kB)
Downloading requests_oauthlib-2.0.0-py2.py3-none-any.whl (24 kB)
Downloading pure_eval-0.2.3-py3-none-any.whl (11 kB)
Downloading pycparser-2.23-py3-none-any.whl (118 kB)
Downloading wcwidth-0.8.2-py3-none-any.whl (323 kB)
Downloading oauthlib-3.3.1-py3-none-any.whl (160 kB)
Building wheels for collected packages: cloudml-hypertune, crepe, mir_eval, tflite_support, dill, crcmod, hdfs, resampy, promise, docopt
  Building wheel for cloudml-hypertune (setup.py): started
  Building wheel for cloudml-hypertune (setup.py): finished with status 'done'
  Created wheel for cloudml-hypertune: filename=cloudml_hypertune-0.1.0.dev6-py2.py3-none-any.whl size=3973 sha256=e0514599122c8d060e595a038aa36da11b41d3e9b59f6f72777d11fa84809037
  Stored in directory: /home/runner/.cache/pip/wheels/92/28/87/5df079d0246bff34428d680be16fec0b3862b004893465228d
  Building wheel for crepe (setup.py): started
  Building wheel for crepe (setup.py): finished with status 'done'
  Created wheel for crepe: filename=crepe-0.0.12-py3-none-any.whl size=134848675 sha256=24576fb57da25c4634d2b7a54c5612861443b9fa68ff34550403ec753436ef8e
  Stored in directory: /home/runner/.cache/pip/wheels/db/8a/a7/a7b62615493bce448786599fe9085d82190c22667372e8db60
  Building wheel for mir_eval (setup.py): started
  Building wheel for mir_eval (setup.py): finished with status 'done'
  Created wheel for mir_eval: filename=mir_eval-0.7-py3-none-any.whl size=100707 sha256=c5fa1e057596b4210e9bfc718aee42eb748cf3c83875ef33f458c04f70f3a629
  Stored in directory: /home/runner/.cache/pip/wheels/e9/f5/d5/eb3db1d056253da195208853842bce745a84b29f44cab59b6c
  Building wheel for tflite_support (setup.py): started
  Building wheel for tflite_support (setup.py): finished with status 'done'
  Created wheel for tflite_support: filename=tflite_support-0.1.0a1-cp39-cp39-linux_x86_64.whl size=6701610 sha256=be5c29868617c9890c86175b226ea0cbe8e33e6e57d1ca093f40e47d832e5a44
  Stored in directory: /home/runner/.cache/pip/wheels/25/13/7a/2aa10dac8ea1dcd41d828123b7904e7174d135870bd4a07fa1
  Building wheel for dill (setup.py): started
  Building wheel for dill (setup.py): finished with status 'done'
  Created wheel for dill: filename=dill-0.3.1.1-py3-none-any.whl size=78542 sha256=d741bb6ddd15ead2d88897f0bd61ae8f00e23345ddb8bb46df4435ba2d2e6a17
  Stored in directory: /home/runner/.cache/pip/wheels/4f/0b/ce/75d96dd714b15e51cb66db631183ea3844e0c4a6d19741a149
  Building wheel for crcmod (setup.py): started
  Building wheel for crcmod (setup.py): finished with status 'done'
  Created wheel for crcmod: filename=crcmod-1.7-cp39-cp39-linux_x86_64.whl size=31269 sha256=d4b3d26483ce65f9c4392d11e0ccdbb4b58e41e02aa7886256e7737373348175
  Stored in directory: /home/runner/.cache/pip/wheels/4a/6c/a6/ffdd136310039bf226f2707a9a8e6857be7d70a3fc061f6b36
  Building wheel for hdfs (setup.py): started
  Building wheel for hdfs (setup.py): finished with status 'done'
  Created wheel for hdfs: filename=hdfs-2.7.3-py3-none-any.whl size=34328 sha256=e177e7ae1b4352f954687a7996006b765226f1567ba43a9defd2e6c099c88acf
  Stored in directory: /home/runner/.cache/pip/wheels/05/6f/21/aa8d233f90da3017b4ef7c61829589dc267402d376dd3efcf5
  Building wheel for resampy (setup.py): started
  Building wheel for resampy (setup.py): finished with status 'done'
  Created wheel for resampy: filename=resampy-0.2.2-py3-none-any.whl size=320712 sha256=b6c0c56509f3835daa27f2b3bc1408c1a20b1014952fb57e14979e257a44913d
  Stored in directory: /home/runner/.cache/pip/wheels/86/2c/7d/46a32a246b0e5939cea2c5ec1492164073e0c5d16d666ae2cd
  Building wheel for promise (setup.py): started
  Building wheel for promise (setup.py): finished with status 'done'
  Created wheel for promise: filename=promise-2.3-py3-none-any.whl size=21486 sha256=0d2ff4b792417851af0841f0a9db08cd83946da4ac65eb3ffae0fcd8f3033c9b
  Stored in directory: /home/runner/.cache/pip/wheels/e1/e8/83/ddea66100678d139b14bc87692ece57c6a2a937956d2532608
  Building wheel for docopt (setup.py): started
  Building wheel for docopt (setup.py): finished with status 'done'
  Created wheel for docopt: filename=docopt-0.6.2-py2.py3-none-any.whl size=13705 sha256=c04f49a08f395875cbaf342889aed9beec5b1eb26489825ce56d81dd7b48a70f
  Stored in directory: /home/runner/.cache/pip/wheels/70/4a/46/1309fc853b8d395e60bafaf1b6df7845bdd82c95fd59dd8d2b
Successfully built cloudml-hypertune crepe mir_eval tflite_support dill crcmod hdfs resampy promise docopt
Installing collected packages: tensorboard-plugin-wit, sortedcontainers, pytz, pydub, pure-eval, ptyprocess, libclang, gin-config, flatbuffers, docopt, dm-tree, crcmod, cloudml-hypertune, zstandard, zipp, xyzservices, wrapt, wcwidth, urllib3, tzdata, typing-extensions, traitlets, tqdm, tornado, toml, threadpoolctl, termcolor, tensorflow-io-gcs-filesystem, tensorflow-estimator, tensorboard-data-server, six, regex, PyYAML, pyparsing, pymongo, pygments, pycparser, pybind11, pyasn1, psutil, protobuf, platformdirs, pillow, pexpect, parso, orjson, opt-einsum, objsize, oauthlib, numpy, msgpack, MarkupSafe, llvmlite, kiwisolver, keras, joblib, intervaltree, idna, google-crc32c, gast, future, fsspec, fonttools, fasteners, fastavro, executing, etils, dill, decorator, cycler, cloudpickle, click, charset_normalizer, certifi, audioread, attrs, asttokens, absl-py, werkzeug, tflite_support, tensorflow-probability, tensorflow-hub, stack-data, soxr, scipy, requests, python-dateutil, pydot, pyasn1-modules, pyarrow, proto-plus, prompt-toolkit, promise, packaging, numba, matplotlib-inline, Jinja2, jedi, importlib_resources, importlib-metadata, imageio, httplib2, h5py, grpcio, googleapis-common-protos, google-resumable-media, google-pasta, exceptiongroup, contourpy, cffi, astunparse, tensorflow-metadata, soundfile, scikit-learn, resampy, requests-oauthlib, pooch, pandas, mir_eval, mido, matplotlib, markdown, lazy-loader, IPython, hdfs, cryptography, pretty-midi, librosa, hmmlearn, google-auth, bokeh, array-record, apache-beam, tensorflow-datasets, note_seq, google-auth-oauthlib, google-api-core, crepe, tensorboard, google-cloud-core, tensorflow, google-cloud-storage, tensorflowjs, ddsp
  DEPRECATION: Legacy editable install of ddsp==3.7.0 from file:///tmp/ddsp (setup.py develop) is deprecated. pip 25.0 will enforce this behaviour change. A possible replacement is to add a pyproject.toml or enable --use-pep517, and use setuptools >= 64. If the resulting installation is not behaving as expected, try using --config-settings editable_mode=compat. Please consult the setuptools documentation for more information. Discussion can be found at https://github.com/pypa/pip/issues/11457
  Running setup.py develop for ddsp
Successfully installed IPython-8.18.1 Jinja2-3.1.6 MarkupSafe-3.0.3 PyYAML-6.0.3 absl-py-1.4.0 apache-beam-2.46.0 array-record-0.5.1 asttokens-3.0.2 astunparse-1.6.3 attrs-26.1.0 audioread-3.1.0 bokeh-3.4.3 certifi-2026.7.22 cffi-2.0.0 charset_normalizer-3.4.9 click-8.1.8 cloudml-hypertune-0.1.0.dev6 cloudpickle-2.2.1 contourpy-1.3.0 crcmod-1.7 crepe-0.0.12 cryptography-50.0.0 cycler-0.12.1 ddsp decorator-5.3.1 dill-0.3.1.1 dm-tree-0.1.8 docopt-0.6.2 etils-1.5.2 exceptiongroup-1.3.1 executing-2.2.1 fastavro-1.12.2 fasteners-0.20 flatbuffers-25.12.19 fonttools-4.60.2 fsspec-2025.10.0 future-1.0.0 gast-0.4.0 gin-config-0.5.0 google-api-core-2.29.0 google-auth-2.50.0 google-auth-oauthlib-0.4.6 google-cloud-core-2.5.1 google-cloud-storage-3.9.0 google-crc32c-1.8.0 google-pasta-0.2.0 google-resumable-media-2.8.2 googleapis-common-protos-1.63.1 grpcio-1.80.0 h5py-3.14.0 hdfs-2.7.3 hmmlearn-0.2.7 httplib2-0.21.0 idna-3.18 imageio-2.37.2 importlib-metadata-8.7.1 importlib_resources-6.5.2 intervaltree-3.2.1 jedi-0.19.2 joblib-1.5.3 keras-2.11.0 kiwisolver-1.4.7 lazy-loader-0.5 libclang-18.1.1 librosa-0.10.0 llvmlite-0.43.0 markdown-3.9 matplotlib-3.9.4 matplotlib-inline-0.2.2 mido-1.3.3 mir_eval-0.7 msgpack-1.1.2 note_seq-0.0.3 numba-0.60.0 numpy-1.23.5 oauthlib-3.3.1 objsize-0.6.1 opt-einsum-3.4.0 orjson-3.11.5 packaging-20.9 pandas-2.3.3 parso-0.8.7 pexpect-4.9.0 pillow-11.3.0 platformdirs-4.4.0 pooch-1.9.0 pretty-midi-0.2.11.post0 promise-2.3 prompt-toolkit-3.0.52 proto-plus-1.27.1 protobuf-3.19.6 psutil-7.2.2 ptyprocess-0.7.0 pure-eval-0.2.3 pyarrow-9.0.0 pyasn1-0.6.4 pyasn1-modules-0.4.2 pybind11-3.1.0 pycparser-2.23 pydot-1.4.2 pydub-0.25.1 pygments-2.20.0 pymongo-3.13.0 pyparsing-3.3.2 python-dateutil-2.9.0.post0 pytz-2026.3.post1 regex-2026.1.15 requests-2.32.5 requests-oauthlib-2.0.0 resampy-0.2.2 scikit-learn-1.6.1 scipy-1.10.1 six-1.17.0 sortedcontainers-2.4.0 soundfile-0.13.1 soxr-1.1.0 stack-data-0.6.3 tensorboard-2.11.2 tensorboard-data-server-0.6.1 tensorboard-plugin-wit-1.8.1 tensorflow-2.11.0 tensorflow-datasets-4.9.0 tensorflow-estimator-2.11.0 tensorflow-hub-0.12.0 tensorflow-io-gcs-filesystem-0.37.1 tensorflow-metadata-1.13.0 tensorflow-probability-0.19.0 tensorflowjs-3.18.0 termcolor-3.1.0 tflite_support-0.1.0a1 threadpoolctl-3.6.0 toml-0.10.2 tornado-6.5.8 tqdm-4.70.0 traitlets-5.15.1 typing-extensions-4.16.0 tzdata-2026.3 urllib3-2.6.3 wcwidth-0.8.2 werkzeug-3.1.8 wrapt-2.4.0rc1 xyzservices-2026.3.0 zipp-3.23.1 zstandard-0.25.0

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
2026-08-08 07:53:49.450892: I tensorflow/core/platform/cpu_feature_guard.cc:193] This TensorFlow binary is optimized with oneAPI Deep Neural Network Library (oneDNN) to use the following CPU instructions in performance-critical operations:  AVX2 FMA
To enable them in other operations, rebuild TensorFlow with the appropriate compiler flags.
2026-08-08 07:53:49.545821: W tensorflow/compiler/xla/stream_executor/platform/default/dso_loader.cc:64] Could not load dynamic library 'libcudart.so.11.0'; dlerror: libcudart.so.11.0: cannot open shared object file: No such file or directory; LD_LIBRARY_PATH: /opt/hostedtoolcache/Python/3.9.25/x64/lib
2026-08-08 07:53:49.545845: I tensorflow/compiler/xla/stream_executor/cuda/cudart_stub.cc:29] Ignore above cudart dlerror if you do not have a GPU set up on your machine.
2026-08-08 07:53:50.237474: W tensorflow/compiler/xla/stream_executor/platform/default/dso_loader.cc:64] Could not load dynamic library 'libnvinfer.so.7'; dlerror: libnvinfer.so.7: cannot open shared object file: No such file or directory; LD_LIBRARY_PATH: /opt/hostedtoolcache/Python/3.9.25/x64/lib
2026-08-08 07:53:50.237567: W tensorflow/compiler/xla/stream_executor/platform/default/dso_loader.cc:64] Could not load dynamic library 'libnvinfer_plugin.so.7'; dlerror: libnvinfer_plugin.so.7: cannot open shared object file: No such file or directory; LD_LIBRARY_PATH: /opt/hostedtoolcache/Python/3.9.25/x64/lib
2026-08-08 07:53:50.237576: W tensorflow/compiler/tf2tensorrt/utils/py_utils.cc:38] TF-TRT Warning: Cannot dlopen some TensorRT libraries. If you would like to use Nvidia GPU with TensorRT, please make sure the missing libraries mentioned above are installed properly.
DDSP_IMPORTS={"core": true, "ddsp": "3.7.0", "effects": true, "losses": true, "numpy": "1.23.5", "packaging": "20.9", "processors": true, "setuptools": "65.5.1", "spectral_ops": true, "synths": true, "tensorflow": "2.11.0", "tensorflow_probability": "0.19.0", "tflite_support": "0.1.0a1"}

```
