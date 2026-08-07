#include <algorithm>
#include <cstdint>
#include <cstring>
#include <iterator>
#include <new>

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

enum SessionStatus {
    kSessionOk = 0,
    kSessionInvalidPointer = 1,
    kSessionNoPatch = 2,
    kSessionInvalidMidi = 3,
    kSessionInvalidSampleRate = 4,
    kSessionInvalidFrames = 5,
    kSessionInvalidBlockAlignment = 6,
    kSessionInvalidVoiceByte = 7,
    kSessionInvalidOperatorMask = 8,
    kSessionInvalidController = 9,
};

bool supportedSampleRate(int sampleRate) {
    return sampleRate == 44100 || sampleRate == 48000;
}

bool validRange(int value, int minimum, int maximum) {
    return value >= minimum && value <= maximum;
}

void initializeMsfaTables(int sampleRate) {
    Exp2::init();
    Sin::init();
    Freqlut::init(sampleRate);
    Lfo::init(sampleRate);
    PitchEnv::init(sampleRate);
    Env::init_sr(sampleRate);
    Porta::init_sr(sampleRate);
}

void configureFmMod(FmMod &mod, int range, int assignment) {
    mod.range = range;
    mod.pitch = (assignment & 0x01) != 0;
    mod.amp = (assignment & 0x02) != 0;
    mod.eg = (assignment & 0x04) != 0;
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

class RealtimeSession {
public:
    explicit RealtimeSession(int requestedSampleRate)
        : sampleRate(requestedSampleRate), note(nullptr) {
        initializeMsfaTables(sampleRate);
        initializeControllers(controllers, 0x3f, &core);
        applyPerformanceState();
        reconstructNote();
    }

    ~RealtimeSession() {
        destroyNote();
    }

    int loadPatch(const uint8_t *source, int sourceLength, uint32_t randomSeed) {
        if (source == nullptr) return kSessionInvalidPointer;
        if (sourceLength != kPatchLength) return kSessionInvalidFrames;
        for (int index = 0; index < kVoiceLength; ++index) {
            if (source[index] > 0x7f) return kSessionInvalidVoiceByte;
        }
        if (source[kOperatorMaskOffset] > 0x3f) return kSessionInvalidOperatorMask;

        std::memcpy(patch, source, kPatchLength);
        seed = randomSeed;
        initializeControllers(controllers, patch[kOperatorMaskOffset], &core);
        applyPerformanceState();
        lfo.reset(patch + 137, seed);
        reconstructNote();
        hasPatch = true;
        noteActive = false;
        return kSessionOk;
    }

    int configurePerformance(
        int requestedPitchBendRange,
        int requestedPitchBendStep,
        int requestedModulationRange,
        int requestedModulationAssignment,
        int requestedAftertouchRange,
        int requestedAftertouchAssignment
    ) {
        if (!validRange(requestedPitchBendRange, 0, 12)
            || !validRange(requestedPitchBendStep, 0, 12)
            || !validRange(requestedModulationRange, 0, 99)
            || !validRange(requestedModulationAssignment, 0, 7)
            || !validRange(requestedAftertouchRange, 0, 99)
            || !validRange(requestedAftertouchAssignment, 0, 7)) {
            return kSessionInvalidController;
        }

        pitchBendRange = requestedPitchBendRange;
        pitchBendStep = requestedPitchBendStep;
        modulationRange = requestedModulationRange;
        modulationAssignment = requestedModulationAssignment;
        aftertouchRange = requestedAftertouchRange;
        aftertouchAssignment = requestedAftertouchAssignment;
        applyPerformanceState();
        return kSessionOk;
    }

    int setPitchBend(int value) {
        if (!validRange(value, 0, 0x3fff)) return kSessionInvalidController;
        pitchBendValue = value;
        controllers.values_[kControllerPitch] = value;
        return kSessionOk;
    }

    int setModulation(int value) {
        if (!validRange(value, 0, 127)) return kSessionInvalidController;
        modulationValue = value;
        controllers.modwheel_cc = value;
        controllers.refresh();
        return kSessionOk;
    }

    int setAftertouch(int value) {
        if (!validRange(value, 0, 127)) return kSessionInvalidController;
        aftertouchValue = value;
        controllers.aftertouch_cc = value;
        controllers.refresh();
        return kSessionOk;
    }

    int noteOn(int midiNote, int velocity) {
        if (!hasPatch) return kSessionNoPatch;
        if (midiNote < 0 || midiNote > 127 || velocity < 1 || velocity > 127) return kSessionInvalidMidi;

        reconstructNote();
        lfo.keydown();
        const int transposedNote = std::clamp(midiNote + static_cast<int>(patch[144]) - 24, 0, 127);
        note->init(patch, transposedNote, velocity, 1, &controllers);
        if (patch[136] != 0) note->oscSync();
        noteActive = true;
        return kSessionOk;
    }

    int noteOff() {
        if (!hasPatch) return kSessionNoPatch;
        if (noteActive) note->keyup();
        return kSessionOk;
    }

    int allNotesOff() {
        if (!hasPatch) return kSessionNoPatch;
        noteActive = false;
        reconstructNote();
        return kSessionOk;
    }

    int render64(float *output) {
        if (output == nullptr) return kSessionInvalidPointer;
        if (!hasPatch) {
            std::fill(output, output + kBlockSize, 0.0f);
            return kSessionNoPatch;
        }

        const int32_t lfoValue = lfo.getsample();
        const int32_t lfoDelay = lfo.getdelay();
        int32_t block[kBlockSize]{};

        if (noteActive) {
            note->compute(block, lfoValue, lfoDelay, &controllers);
            if (!note->isPlaying()) noteActive = false;
        }

        for (int index = 0; index < kBlockSize; ++index) {
            output[index] = convertDrySample(block[index]);
        }
        return kSessionOk;
    }

    bool isPlaying() const {
        return noteActive;
    }

private:
    int sampleRate;
    uint32_t seed = 0;
    uint8_t patch[kPatchLength]{};
    bool hasPatch = false;
    bool noteActive = false;
    int pitchBendValue = kPitchCenter;
    int pitchBendRange = 3;
    int pitchBendStep = 0;
    int modulationValue = 0;
    int modulationRange = 0;
    int modulationAssignment = 0;
    int aftertouchValue = 0;
    int aftertouchRange = 0;
    int aftertouchAssignment = 0;
    FmCore core;
    Controllers controllers;
    Lfo lfo;
    alignas(Dx7Note) unsigned char noteStorage[sizeof(Dx7Note)];
    Dx7Note *note;

    void applyPerformanceState() {
        controllers.values_[kControllerPitch] = pitchBendValue;
        controllers.values_[kControllerPitchRangeUp] = pitchBendRange;
        controllers.values_[kControllerPitchRangeDn] = pitchBendRange;
        controllers.values_[kControllerPitchStep] = pitchBendStep;
        configureFmMod(controllers.wheel, modulationRange, modulationAssignment);
        configureFmMod(controllers.at, aftertouchRange, aftertouchAssignment);
        controllers.modwheel_cc = modulationValue;
        controllers.aftertouch_cc = aftertouchValue;
        controllers.refresh();
    }

    void destroyNote() {
        if (note != nullptr) {
            note->~Dx7Note();
            note = nullptr;
        }
    }

    void reconstructNote() {
        destroyNote();
        note = new (noteStorage) Dx7Note();
    }
};

RealtimeSession *sessionFromHandle(uintptr_t handle) {
    return reinterpret_cast<RealtimeSession *>(handle);
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
    if (patch == nullptr || output == nullptr) return kSessionInvalidPointer;
    if (patchLength != kPatchLength) return 2;
    if (midiNote < 0 || midiNote > 127 || velocity < 1 || velocity > 127) return kSessionInvalidMidi;
    if (!supportedSampleRate(sampleRate)) return kSessionInvalidSampleRate;
    if (noteOnFrames <= 0 || releaseFrames < 0 || outputFrames != noteOnFrames + releaseFrames) return kSessionInvalidFrames;
    if ((noteOnFrames % kBlockSize) != 0 || (releaseFrames % kBlockSize) != 0) return kSessionInvalidBlockAlignment;

    for (int index = 0; index < kVoiceLength; ++index) {
        if (patch[index] > 0x7f) return kSessionInvalidVoiceByte;
    }
    if (patch[kOperatorMaskOffset] > 0x3f) return kSessionInvalidOperatorMask;

    initializeMsfaTables(sampleRate);

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

    return kSessionOk;
}

FM1_EXPORT uintptr_t fm1_msfa_session_create(int sampleRate) {
    if (!supportedSampleRate(sampleRate)) return 0;
    auto *session = new (std::nothrow) RealtimeSession(sampleRate);
    return reinterpret_cast<uintptr_t>(session);
}

FM1_EXPORT void fm1_msfa_session_destroy(uintptr_t handle) {
    delete sessionFromHandle(handle);
}

FM1_EXPORT int fm1_msfa_session_load_patch(
    uintptr_t handle,
    const uint8_t *patch,
    int patchLength,
    uint32_t randomSeed
) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->loadPatch(patch, patchLength, randomSeed);
}

FM1_EXPORT int fm1_msfa_session_configure_performance(
    uintptr_t handle,
    int pitchBendRange,
    int pitchBendStep,
    int modulationRange,
    int modulationAssignment,
    int aftertouchRange,
    int aftertouchAssignment
) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->configurePerformance(
        pitchBendRange,
        pitchBendStep,
        modulationRange,
        modulationAssignment,
        aftertouchRange,
        aftertouchAssignment
    );
}

FM1_EXPORT int fm1_msfa_session_set_pitch_bend(uintptr_t handle, int value) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->setPitchBend(value);
}

FM1_EXPORT int fm1_msfa_session_set_modulation(uintptr_t handle, int value) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->setModulation(value);
}

FM1_EXPORT int fm1_msfa_session_set_aftertouch(uintptr_t handle, int value) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->setAftertouch(value);
}

FM1_EXPORT int fm1_msfa_session_note_on(uintptr_t handle, int midiNote, int velocity) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->noteOn(midiNote, velocity);
}

FM1_EXPORT int fm1_msfa_session_note_off(uintptr_t handle) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->noteOff();
}

FM1_EXPORT int fm1_msfa_session_all_notes_off(uintptr_t handle) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->allNotesOff();
}

FM1_EXPORT int fm1_msfa_session_render64(uintptr_t handle, float *output) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return kSessionInvalidPointer;
    return session->render64(output);
}

FM1_EXPORT int fm1_msfa_session_is_playing(uintptr_t handle) {
    auto *session = sessionFromHandle(handle);
    if (session == nullptr) return 0;
    return session->isPlaying() ? 1 : 0;
}

FM1_EXPORT int fm1_msfa_block_size() {
    return kBlockSize;
}

FM1_EXPORT int fm1_msfa_patch_length() {
    return kPatchLength;
}

} // extern "C"
