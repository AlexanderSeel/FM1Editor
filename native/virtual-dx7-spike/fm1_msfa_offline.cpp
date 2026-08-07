#include <algorithm>
#include <cstdint>
#include <cstring>
#include <iterator>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define FM1_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define FM1_EXPORT
#endif

#include "msfa/controllers.h"
#include "msfa/dx7note.h"
#include "msfa/env.h"
#include "msfa/exp2.h"
#include "msfa/fm_core.h"
#include "msfa/freqlut.h"
#include "msfa/lfo.h"
#include "msfa/pitchenv.h"
#include "msfa/porta.h"
#include "msfa/sin.h"
#include "msfa/synth.h"

namespace {
constexpr int kPatchLength = 156;
constexpr int kVoiceLength = 155;
constexpr int kOperatorMaskOffset = 155;
constexpr int kBlockSize = N;
constexpr int kPitchCenter = 0x2000;

bool supportedSampleRate(int sampleRate) {
    return sampleRate == 44100 || sampleRate == 48000;
}

void initializeControllers(Controllers &controllers, uint8_t operatorMask, FmCore *core) {
    std::fill(std::begin(controllers.values_), std::end(controllers.values_), 0);
    controllers.values_[kControllerPitch] = kPitchCenter;
    controllers.values_[kControllerPitchRangeUp] = 3;
    controllers.values_[kControllerPitchRangeDn] = 3;
    controllers.values_[kControllerPitchStep] = 0;
    controllers.aftertouch_cc = 0;
    controllers.breath_cc = 0;
    controllers.foot_cc = 0;
    controllers.modwheel_cc = 0;
    controllers.portamento_enable_cc = false;
    controllers.portamento_cc = 0;
    controllers.portamento_gliss_cc = false;
    controllers.masterTune = 0;
    controllers.mpeEnabled = false;
    controllers.core = core;

    for (int op = 0; op < 6; ++op) {
        const int bit = 5 - op;
        controllers.opSwitch[op] = (operatorMask & (1 << bit)) != 0 ? '1' : '0';
    }
    controllers.opSwitch[6] = '\0';
    controllers.refresh();
}

float convertDrySample(int32_t sample) {
    int32_t value = sample >> 4;
    int clipValue = value < -(1 << 24)
        ? -0x8000
        : value >= (1 << 24)
            ? 0x7fff
            : value >> 9;
    float result = static_cast<float>(clipValue) / static_cast<float>(0x8000);
    return std::clamp(result, -1.0f, 1.0f);
}
} // namespace

extern "C" {

FM1_EXPORT int fm1_msfa_render(
    const uint8_t *patch,
    int patchLength,
    int midiNote,
    int velocity,
    int sampleRate,
    int noteOnFrames,
    int releaseFrames,
    uint32_t randomSeed,
    float *output,
    int outputFrames
) {
    if (patch == nullptr || output == nullptr) return 1;
    if (patchLength != kPatchLength) return 2;
    if (midiNote < 0 || midiNote > 127 || velocity < 1 || velocity > 127) return 3;
    if (!supportedSampleRate(sampleRate)) return 4;
    if (noteOnFrames <= 0 || releaseFrames < 0 || outputFrames != noteOnFrames + releaseFrames) return 5;
    if ((noteOnFrames % kBlockSize) != 0 || (releaseFrames % kBlockSize) != 0) return 6;

    for (int index = 0; index < kVoiceLength; ++index) {
        if (patch[index] > 0x7f) return 7;
    }
    if (patch[kOperatorMaskOffset] > 0x3f) return 8;

    Exp2::init();
    Sin::init();
    Freqlut::init(sampleRate);
    Lfo::init(sampleRate);
    PitchEnv::init(sampleRate);
    Env::init_sr(sampleRate);
    Porta::init_sr(sampleRate);

    FmCore core;
    Controllers controllers;
    initializeControllers(controllers, patch[kOperatorMaskOffset], &core);

    Lfo lfo;
    lfo.reset(patch + 137, randomSeed);
    lfo.keydown();

    Dx7Note note;
    const int transposedNote = std::clamp(midiNote + static_cast<int>(patch[144]) - 24, 0, 127);
    note.init(patch, transposedNote, velocity, 1, &controllers);
    if (patch[136] != 0) note.oscSync();

    int32_t block[kBlockSize];
    for (int frame = 0; frame < outputFrames; frame += kBlockSize) {
        if (frame == noteOnFrames) note.keyup();
        std::fill(std::begin(block), std::end(block), 0);
        const int32_t lfoValue = lfo.getsample();
        const int32_t lfoDelay = lfo.getdelay();
        note.compute(block, lfoValue, lfoDelay, &controllers);
        for (int index = 0; index < kBlockSize; ++index) {
            output[frame + index] = convertDrySample(block[index]);
        }
    }

    return 0;
}

FM1_EXPORT int fm1_msfa_block_size() {
    return kBlockSize;
}

FM1_EXPORT int fm1_msfa_patch_length() {
    return kPatchLength;
}

} // extern "C"
