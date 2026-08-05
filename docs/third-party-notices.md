# Third-party notices

## DX7 algorithm routing topology

FM1 Editor's graphical 32-algorithm routing definitions are derived from the operator-bus flag table and evaluation semantics in Google's **music-synthesizer-for-android** project:

- Project: `google/music-synthesizer-for-android`
- Source file: `app/src/main/jni/fm_core.cc`
- Copyright: 2012 Google Inc.
- License: Apache License 2.0
- Source: https://github.com/google/music-synthesizer-for-android/blob/master/app/src/main/jni/fm_core.cc
- License: https://github.com/google/music-synthesizer-for-android/blob/master/LICENSE

Only the numeric routing definitions and their documented bus interpretation are used to derive display topology, carrier/modulator roles and feedback edges. FM1 Editor does not embed the referenced synthesis engine.

Dexed also identifies its FM engine as based on the same Google MSFA project and provides a useful independent compatibility reference for DX7-oriented implementations:

- https://github.com/asb2m10/dexed

The FM1 Editor application source remains licensed under MIT except where a third-party notice states otherwise. Third-party patch-bank rights remain separate from the application source-code license.
