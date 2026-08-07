# FM1 Editor MSFA-compatible core notices

This package contains a narrowly selected and modified subset of the MSFA sound engine as present in `asb2m10/dexed` commit `2e182b3db85c09083ab13c8b9b00565ce7d9ff85`.

The included MSFA source files retain their original copyright and Apache-2.0 headers. Seven derived files carry prominent FM1 Editor modification notices, including deterministic LFO phase and sample-and-hold seed initialization. The exact upstream and derived hashes and modifications are recorded in `manifest.json`.

FM1 Editor excludes the complete Dexed GPL-3.0 application/plugin wrapper, JUCE, MTS-ESP, the external tuning library, Dexed effects/UI/assets/cartridges and third-party patch banks from this package. The browser engine is standard-12-TET only at this stage.

No `NOTICE` or `NOTICE.txt` file was present at the reviewed Dexed repository root or the reviewed original Google `music-synthesizer-for-android` repository root. This file therefore records FM1 Editor's provenance and modifications rather than inventing upstream NOTICE text.

Browser artifacts are built with Emscripten 4.0.7. Toolchain license material retained for the generated runtime/support code is stored under `toolchain/` and is also published beside the browser artifact.

The virtual result is a DX7-compatible dry renderer. It is not a claim of physical Yamaha DX7 or M-VAVE FM-1 equivalence.
