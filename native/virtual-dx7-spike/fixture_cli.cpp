#include <array>
#include <cctype>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

extern "C" int fm1_msfa_render(
    const uint8_t *patch,
    int patchLength,
    int midiNote,
    int velocity,
    int sampleRate,
    int noteOnFrames,
    int releaseFrames,
    float *output,
    int outputFrames
);

namespace {
constexpr int kPatchLength = 156;

int hexNibble(char value) {
    if (value >= '0' && value <= '9') return value - '0';
    value = static_cast<char>(std::tolower(static_cast<unsigned char>(value)));
    if (value >= 'a' && value <= 'f') return value - 'a' + 10;
    return -1;
}

std::array<uint8_t, kPatchLength> readPatch(const std::string &path) {
    std::ifstream input(path);
    if (!input) throw std::runtime_error("Unable to open reference patch: " + path);
    std::string hex;
    char ch;
    while (input.get(ch)) {
        if (!std::isspace(static_cast<unsigned char>(ch))) hex.push_back(ch);
    }
    if (hex.size() != kPatchLength * 2) throw std::runtime_error("Reference patch must contain exactly 156 hexadecimal bytes.");

    std::array<uint8_t, kPatchLength> patch{};
    for (int index = 0; index < kPatchLength; ++index) {
        const int high = hexNibble(hex[index * 2]);
        const int low = hexNibble(hex[index * 2 + 1]);
        if (high < 0 || low < 0) throw std::runtime_error("Reference patch contains a non-hexadecimal character.");
        patch[index] = static_cast<uint8_t>((high << 4) | low);
    }
    return patch;
}

void writeFloat32(const std::string &path, const std::vector<float> &samples) {
    std::ofstream output(path, std::ios::binary);
    if (!output) throw std::runtime_error("Unable to create render output: " + path);
    output.write(reinterpret_cast<const char *>(samples.data()), static_cast<std::streamsize>(samples.size() * sizeof(float)));
    if (!output) throw std::runtime_error("Failed while writing render output: " + path);
}
} // namespace

int main(int argc, char **argv) {
    if (argc != 3 && argc != 5) {
        std::cerr << "Usage: fixture_cli <reference-patch.hex> <output.f32> [note-on-seconds release-seconds]\n";
        return 2;
    }

    try {
        const auto patch = readPatch(argv[1]);
        constexpr int sampleRate = 48000;
        const int noteOnSeconds = argc == 5 ? std::stoi(argv[3]) : 1;
        const int releaseSeconds = argc == 5 ? std::stoi(argv[4]) : 0;
        const int noteOnFrames = sampleRate * noteOnSeconds;
        const int releaseFrames = argc == 5 ? sampleRate * releaseSeconds : sampleRate / 2;
        const int outputFrames = noteOnFrames + releaseFrames;
        std::vector<float> samples(static_cast<std::size_t>(outputFrames));

        const int result = fm1_msfa_render(
            patch.data(), static_cast<int>(patch.size()), 60, 100, sampleRate,
            noteOnFrames, releaseFrames, samples.data(), outputFrames
        );
        if (result != 0) {
            std::cerr << "fm1_msfa_render failed with status " << result << "\n";
            return result;
        }
        writeFloat32(argv[2], samples);
        std::cout << "rendered " << outputFrames << " dry mono Float32 frames\n";
        return 0;
    } catch (const std::exception &error) {
        std::cerr << error.what() << "\n";
        return 1;
    }
}
