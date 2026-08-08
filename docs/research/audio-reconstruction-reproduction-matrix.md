# Audio reconstruction upstream reproduction matrix

Overall admission/reproduction gate: **INCOMPLETE**

| Approach | Exact pin | Code license | Reproduction outcome | Artifact/data boundary | Production admitted |
| --- | --- | --- | --- | --- | --- |
| Sound2Synth core | `44d9176176d794f7fe3ec96573ce758f4a56896c` | no explicit root license | BLOCKED before execution | external presets/datasets/checkpoints unadmitted | no |
| Sound2Synth Dexed plug-in | `560ba5772118712eca78a3583023c366817fcfa9` | GPL-3.0 | research reference only | GPL wrapper/VST outside MSFA boundary | no |
| SpiegeLib | `1a3fa1a172c89b869928005874071d0220fc9ccc` | MIT root | SUCCESS | Sound2Synth-derived estimator files blocked; no VST/RenderMan/data/weights | no |
| DDX7 | `11d04fc16475ff81454f7436f318df9836971a0c` | Apache-2.0 | SUCCESS with NumPy 1.23.5 ABI constraint | URMP/data/checkpoints remain separate | no |
| Magenta DDSP | `cf5e62dfe5d5c80aa14761832233a2e68e840e53` | Apache-2.0 | receipt missing/failed | pretrained models/datasets require separate license+hash | no |

A successful gate means every reviewed external method has an immutable source identity, explicit license/provenance disposition and either a controlled reproduction or an intentional block. It does **not** admit external code, weights, datasets or preprocessing into FM1 Editor. Any future production use requires a separate admission review with file/artifact hashes and licenses.

Evidence: `docs/research/audio-reconstruction-upstreams.json`, `docs/validation/sound2synth-license-block.md`, `docs/validation/spiegelib-isolated-reproduction.md`, `docs/validation/ddx7-numpy-compat-reproduction.md`, and `docs/validation/ddsp-isolated-reproduction.md`.
