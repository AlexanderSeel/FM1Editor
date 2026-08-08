# Sound2Synth reproduction/license block

Pinned upstream: `Sound2Synth/Sound2Synth@44d9176176d794f7fe3ec96573ce758f4a56896c`

Safe reproduction decision: **BLOCKED**

| Check | Exit / state |
| --- | ---: |
| clone | 0 |
| exact checkout | 0 |
| pin verification | 0 |
| explicit root license absent | 0 |
| bundled checkpoint absent | 0 |

At the reviewed pin there is no explicit root LICENSE/COPYING file and no bundled checkpoint artifact that can be independently license-hashed. The project instructions also refer to external preset/dataset sources. FM1 Editor therefore does not execute, copy, vendor or redistribute the Sound2Synth research code or a model checkpoint.

The associated Sound2Synth-modified Dexed plug-in is separately classified GPL-3.0 and remains outside the current Apache/MSFA runtime boundary. This block is a successful safety/provenance outcome, not a claim that Sound2Synth itself is unusable under private permission from its authors.

Audit log:
```text
Cloning into '/tmp/sound2synth'...
HEAD is now at 44d9176 ijcai publish
.git/HEAD
.git/config
.git/description
.git/hooks/applypatch-msg.sample
.git/hooks/commit-msg.sample
.git/hooks/fsmonitor-watchman.sample
.git/hooks/post-update.sample
.git/hooks/pre-applypatch.sample
.git/hooks/pre-commit.sample
.git/hooks/pre-merge-commit.sample
.git/hooks/pre-push.sample
.git/hooks/pre-rebase.sample
.git/hooks/pre-receive.sample
.git/hooks/prepare-commit-msg.sample
.git/hooks/push-to-checkout.sample
.git/hooks/sendemail-validate.sample
.git/hooks/update.sample
.git/index
.git/info/exclude
.git/logs/HEAD
.git/packed-refs
.gitignore
PyAU/README.txt
README.md
config.json
dataset/__init__.py
dataset/base.py
dataset/multimodal.py
dataset/spec.py
interface/__init__.py
interface/base.py
interface/dexed.py
manager.py
model/__init__.py
model/conv_backbone.py
model/convmixer_backbone.py
model/linear_backbone.py
model/lstm_backbone.py
model/main_backbone.py
model/multimodal_backbone.py
model/net.py
model/pdc_backbone.py
preprocess/dexed.py
requirements.txt
run.sh
server.sh
server/app.py
server/ensemble.sh
server/server.py
sound2synth.py
test.py
train.py
utils/__init__.py
utils/audio_utils.py
utils/basic_utils.py
utils/loss_utils.py
utils/metrics.py
utils/pyau_utils.py
42:1. This repo does not hold Dexed preset libraries. Please obtain organized Dexed preset libraries from online communities or any other way. For example, you can download some presets from [this link](https://www.audiopluginguy.com/free-dexed-plus-tonnes-patches/). Put the obtained presets under `data_dir` as what is set in the `config.json` file.
44:2. Modify and run `preprocess/dexed.py` to preprocess datasets according to your needs.
55:1. Please check out the arguments specified in `manager.py`, `train.py`, and `test.py`. `manager.py` is responsible for deploying code and data to a remote server, initiating the training process, monitoring training procedures, and summarizing results. Each training procedure will be synced and saved locally on the MacOS under `examples/`, with checkpoints, validation statistics, and inference (test) statistics stored.
57:2. Modify and run `manager.py` according to your needs. For example, the following command trains a multi-modal network using all 3 dataset generation methods on Algorithm $0$ (notice that dataset must be fully preprocessed before training):
70:2. A trained Sound2Synth model or an ensemble of trained Sound2Synth models. Please refer to the "Training" section for building such models. Pre-trained checkpoints may be released in the future.
87:Trained checkpoints for directly using the Sound2SYnth plug-in server will be uploaded soon. The checkpoints and experiment results will be maintained and updated for progress.

```
