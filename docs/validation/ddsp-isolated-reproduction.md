# Magenta DDSP isolated environment reproduction

Pinned upstream: `magenta/ddsp@cf5e62dfe5d5c80aa14761832233a2e68e840e53`

Code license reviewed: **Apache-2.0**

Environment smoke: **FAILED**

| Stage | Exit |
| --- | ---: |
| toolchain bootstrap | 0 |
| editable install with prerelease resolution | 1 |
| base DSP imports | 99 |

Resolved imports: `not resolved`.

The pinned setup declares `tflite_support<=0.1`, for which the package index exposes matching 0.1.0 alpha prereleases but no matching stable release. This rerun therefore permits prerelease dependency resolution without modifying upstream source.

This reproduction exercises the pinned source package and its differentiable core/synth/effect/loss imports. It downloads no pretrained timbre-transfer model, training dataset or model checkpoint. Any such artifact remains blocked until its own immutable hash and reuse license are recorded.

No DDSP runtime, model, dataset or preprocessing is admitted into FM1 Editor by this research smoke.

Environment snapshot:
```text

```

Execution log:
```text
dpoolctl-3.6.0-py3-none-any.whl (18 kB)
Downloading tornado-6.5.8-cp39-abi3-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl (450 kB)
Downloading traitlets-5.15.1-py3-none-any.whl (85 kB)
Downloading tzdata-2026.3-py2.py3-none-any.whl (348 kB)
Downloading urllib3-2.6.3-py3-none-any.whl (131 kB)
Downloading werkzeug-3.1.8-py3-none-any.whl (226 kB)
Downloading wheel-0.45.1-py3-none-any.whl (72 kB)
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
  Created wheel for cloudml-hypertune: filename=cloudml_hypertune-0.1.0.dev6-py2.py3-none-any.whl size=4024 sha256=db67cbb7d16821799c014355017c5a68c251b0b87db1d6762bc626f6b6e3927d
  Stored in directory: /home/runner/.cache/pip/wheels/92/28/87/5df079d0246bff34428d680be16fec0b3862b004893465228d
  Building wheel for crepe (setup.py): started
  Building wheel for crepe (setup.py): finished with status 'done'
  Created wheel for crepe: filename=crepe-0.0.12-py3-none-any.whl size=134848737 sha256=18ce595c9915973ccaa63baa8a042bf2fadebb453de1e08938f7e59e0610edcd
  Stored in directory: /home/runner/.cache/pip/wheels/db/8a/a7/a7b62615493bce448786599fe9085d82190c22667372e8db60
  Building wheel for mir_eval (setup.py): started
  Building wheel for mir_eval (setup.py): finished with status 'done'
  Created wheel for mir_eval: filename=mir_eval-0.7-py3-none-any.whl size=100765 sha256=c69d2329fe6a09619584c62dbe2ade437ed6ec268c22016f6ca34648e100cb85
  Stored in directory: /home/runner/.cache/pip/wheels/e9/f5/d5/eb3db1d056253da195208853842bce745a84b29f44cab59b6c
  Building wheel for tflite_support (setup.py): started
  Building wheel for tflite_support (setup.py): finished with status 'done'
  Created wheel for tflite_support: filename=tflite_support-0.1.0a1-cp39-cp39-linux_x86_64.whl size=6701616 sha256=e61a5917207256fbd1116825de10c78e200ab31ec5f2428e28ef6e0a77ce34c6
  Stored in directory: /home/runner/.cache/pip/wheels/25/13/7a/2aa10dac8ea1dcd41d828123b7904e7174d135870bd4a07fa1
  Building wheel for dill (setup.py): started
  Building wheel for dill (setup.py): finished with status 'done'
  Created wheel for dill: filename=dill-0.3.1.1-py3-none-any.whl size=78605 sha256=5eb39ed1e79c186111137811ffe0ae6c5fda2f172b647094c055cd14f115b837
  Stored in directory: /home/runner/.cache/pip/wheels/4f/0b/ce/75d96dd714b15e51cb66db631183ea3844e0c4a6d19741a149
  Building wheel for crcmod (setup.py): started
  Building wheel for crcmod (setup.py): finished with status 'done'
  Created wheel for crcmod: filename=crcmod-1.7-cp39-cp39-linux_x86_64.whl size=31318 sha256=f7805c5b6205d8c7d01b6fe6451dc82a451cf1b62782d0a2c79df25c48f5c021
  Stored in directory: /home/runner/.cache/pip/wheels/4a/6c/a6/ffdd136310039bf226f2707a9a8e6857be7d70a3fc061f6b36
  Building wheel for hdfs (setup.py): started
  Building wheel for hdfs (setup.py): finished with status 'done'
  Created wheel for hdfs: filename=hdfs-2.7.3-py3-none-any.whl size=34382 sha256=91549bf2574f43d299a15aba48d48a74af0ee8364b07dedb27d4a1bc3b630e24
  Stored in directory: /home/runner/.cache/pip/wheels/05/6f/21/aa8d233f90da3017b4ef7c61829589dc267402d376dd3efcf5
  Building wheel for resampy (setup.py): started
  Building wheel for resampy (setup.py): finished with status 'done'
  Created wheel for resampy: filename=resampy-0.2.2-py3-none-any.whl size=320755 sha256=d6925be99da09c472027523e4baf9d54204edc2fd506186f5892dd6ae68e84ed
  Stored in directory: /home/runner/.cache/pip/wheels/86/2c/7d/46a32a246b0e5939cea2c5ec1492164073e0c5d16d666ae2cd
  Building wheel for promise (setup.py): started
  Building wheel for promise (setup.py): finished with status 'done'
  Created wheel for promise: filename=promise-2.3-py3-none-any.whl size=21548 sha256=4c4aceb23363b2bfb0c605aac41bf77fd9b718c1bf51b77c8bab080431e80cfc
  Stored in directory: /home/runner/.cache/pip/wheels/e1/e8/83/ddea66100678d139b14bc87692ece57c6a2a937956d2532608
  Building wheel for docopt (setup.py): started
  Building wheel for docopt (setup.py): finished with status 'done'
  Created wheel for docopt: filename=docopt-0.6.2-py2.py3-none-any.whl size=13749 sha256=e21507ab618c71c266a72de61a3354bb2be151cfc83caf5d1709d8e21bbb3b31
  Stored in directory: /home/runner/.cache/pip/wheels/70/4a/46/1309fc853b8d395e60bafaf1b6df7845bdd82c95fd59dd8d2b
Successfully built cloudml-hypertune crepe mir_eval tflite_support dill crcmod hdfs resampy promise docopt
Installing collected packages: tensorboard-plugin-wit, sortedcontainers, pytz, pydub, pure-eval, ptyprocess, libclang, gin-config, flatbuffers, docopt, dm-tree, crcmod, cloudml-hypertune, zstandard, zipp, xyzservices, wrapt, wheel, wcwidth, urllib3, tzdata, typing-extensions, traitlets, tqdm, tornado, toml, threadpoolctl, termcolor, tensorflow-io-gcs-filesystem, tensorflow-estimator, tensorboard-data-server, six, regex, PyYAML, pyparsing, pymongo, pygments, pycparser, pybind11, pyasn1, psutil, protobuf, platformdirs, pillow, pexpect, parso, orjson, opt-einsum, objsize, oauthlib, numpy, msgpack, MarkupSafe, llvmlite, kiwisolver, keras, joblib, intervaltree, idna, google-crc32c, gast, future, fsspec, fonttools, fasteners, fastavro, executing, etils, dill, decorator, cycler, cloudpickle, click, charset_normalizer, certifi, audioread, attrs, asttokens, absl-py, werkzeug, tflite_support, tensorflow-probability, tensorflow-hub, stack-data, soxr, scipy, requests, python-dateutil, pydot, pyasn1-modules, pyarrow, proto-plus, prompt-toolkit, promise, packaging, numba, matplotlib-inline, Jinja2, jedi, importlib_resources, importlib-metadata, imageio, httplib2, h5py, grpcio, googleapis-common-protos, google-resumable-media, google-pasta, exceptiongroup, contourpy, cffi, astunparse, tensorflow-metadata, soundfile, scikit-learn, resampy, requests-oauthlib, pooch, pandas, mir_eval, mido, matplotlib, markdown, lazy-loader, IPython, hdfs, cryptography, pretty-midi, librosa, hmmlearn, google-auth, bokeh, array-record, apache-beam, tensorflow-datasets, note_seq, google-auth-oauthlib, google-api-core, crepe, tensorboard, google-cloud-core, tensorflow, google-cloud-storage, tensorflowjs, ddsp
  Attempting uninstall: wheel
    Found existing installation: wheel 0.47.0
    Uninstalling wheel-0.47.0:
      Successfully uninstalled wheel-0.47.0
  Attempting uninstall: packaging
    Found existing installation: packaging 26.3
    Uninstalling packaging-26.3:
      Successfully uninstalled packaging-26.3
  DEPRECATION: Legacy editable install of ddsp==3.7.0 from file:///tmp/ddsp (setup.py develop) is deprecated. pip 25.0 will enforce this behaviour change. A possible replacement is to add a pyproject.toml or enable --use-pep517, and use setuptools >= 64. If the resulting installation is not behaving as expected, try using --config-settings editable_mode=compat. Please consult the setuptools documentation for more information. Discussion can be found at https://github.com/pypa/pip/issues/11457
  Running setup.py develop for ddsp
    error: subprocess-exited-with-error
    
    × python setup.py develop did not run successfully.
    │ exit code: 1
    ╰─> [54 lines of output]
        /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/__init__.py:94: _DeprecatedInstaller: setuptools.installer and fetch_build_eggs are deprecated.
        !!
        
                ********************************************************************************
                Requirements should be satisfied by a PEP 517 installer.
                If you are using pip, you can try `pip install --use-pep517`.
                ********************************************************************************
        
        !!
          dist.fetch_build_eggs(dist.setup_requires)
        /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py:270: UserWarning: Unknown distribution option: 'tests_require'
          warnings.warn(msg)
        running develop
        /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/develop.py:41: EasyInstallDeprecationWarning: easy_install command is deprecated.
        !!
        
                ********************************************************************************
                Please avoid running ``setup.py`` and ``easy_install``.
                Instead, use pypa/build, pypa/installer or other
                standards-based tools.
        
                See https://github.com/pypa/setuptools/issues/917 for details.
                ********************************************************************************
        
        !!
          easy_install.initialize_options(self)
        Traceback (most recent call last):
          File "<string>", line 2, in <module>
          File "<pip-setuptools-caller>", line 34, in <module>
          File "/tmp/ddsp/setup.py", line 26, in <module>
            setuptools.setup(
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/__init__.py", line 117, in setup
            return distutils.core.setup(**attrs)
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/core.py", line 186, in setup
            return run_commands(dist)
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/core.py", line 202, in run_commands
            dist.run_commands()
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py", line 983, in run_commands
            self.run_command(cmd)
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/dist.py", line 999, in run_command
            super().run_command(command)
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py", line 1001, in run_command
            cmd_obj.ensure_finalized()
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/cmd.py", line 124, in ensure_finalized
            self.finalize_options()
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/develop.py", line 51, in finalize_options
            easy_install.finalize_options(self)
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/easy_install.py", line 251, in finalize_options
            'dist_fullname': self.distribution.get_fullname(),
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_core_metadata.py", line 272, in get_fullname
            return _distribution_fullname(self.get_name(), self.get_version())
          File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_core_metadata.py", line 290, in _distribution_fullname
            canonicalize_version(version, strip_trailing_zero=False),
        TypeError: canonicalize_version() got an unexpected keyword argument 'strip_trailing_zero'
        [end of output]
    
    note: This error originates from a subprocess, and is likely not a problem with pip.

[notice] A new release of pip is available: 24.3.1 -> 26.0.1
[notice] To update, run: pip install --upgrade pip
error: subprocess-exited-with-error

× python setup.py develop did not run successfully.
│ exit code: 1
╰─> [54 lines of output]
    /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/__init__.py:94: _DeprecatedInstaller: setuptools.installer and fetch_build_eggs are deprecated.
    !!
    
            ********************************************************************************
            Requirements should be satisfied by a PEP 517 installer.
            If you are using pip, you can try `pip install --use-pep517`.
            ********************************************************************************
    
    !!
      dist.fetch_build_eggs(dist.setup_requires)
    /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py:270: UserWarning: Unknown distribution option: 'tests_require'
      warnings.warn(msg)
    running develop
    /tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/develop.py:41: EasyInstallDeprecationWarning: easy_install command is deprecated.
    !!
    
            ********************************************************************************
            Please avoid running ``setup.py`` and ``easy_install``.
            Instead, use pypa/build, pypa/installer or other
            standards-based tools.
    
            See https://github.com/pypa/setuptools/issues/917 for details.
            ********************************************************************************
    
    !!
      easy_install.initialize_options(self)
    Traceback (most recent call last):
      File "<string>", line 2, in <module>
      File "<pip-setuptools-caller>", line 34, in <module>
      File "/tmp/ddsp/setup.py", line 26, in <module>
        setuptools.setup(
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/__init__.py", line 117, in setup
        return distutils.core.setup(**attrs)
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/core.py", line 186, in setup
        return run_commands(dist)
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/core.py", line 202, in run_commands
        dist.run_commands()
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py", line 983, in run_commands
        self.run_command(cmd)
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/dist.py", line 999, in run_command
        super().run_command(command)
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/dist.py", line 1001, in run_command
        cmd_obj.ensure_finalized()
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_distutils/cmd.py", line 124, in ensure_finalized
        self.finalize_options()
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/develop.py", line 51, in finalize_options
        easy_install.finalize_options(self)
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/command/easy_install.py", line 251, in finalize_options
        'dist_fullname': self.distribution.get_fullname(),
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_core_metadata.py", line 272, in get_fullname
        return _distribution_fullname(self.get_name(), self.get_version())
      File "/tmp/ddsp-venv-v2/lib/python3.9/site-packages/setuptools/_core_metadata.py", line 290, in _distribution_fullname
        canonicalize_version(version, strip_trailing_zero=False),
    TypeError: canonicalize_version() got an unexpected keyword argument 'strip_trailing_zero'
    [end of output]

note: This error originates from a subprocess, and is likely not a problem with pip.

```
