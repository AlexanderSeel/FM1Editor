#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: scripts/build-msfa-spike.sh <materialized-root> <output-root> <native|wasm|both>" >&2
  exit 2
fi

MATERIALIZED_ROOT="$(cd "$1" && pwd)"
OUTPUT_ROOT="$2"
MODE="$3"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MSFA_ROOT="$MATERIALIZED_ROOT/msfa"
BRIDGE="$REPO_ROOT/native/virtual-dx7-spike/fm1_msfa_offline.cpp"
CLI="$REPO_ROOT/native/virtual-dx7-spike/fixture_cli.cpp"

case "$MODE" in
  native|wasm|both) ;;
  *) echo "Build mode must be native, wasm or both." >&2; exit 2 ;;
esac

mkdir -p "$OUTPUT_ROOT"

SOURCES=(
  "$MSFA_ROOT/env.cc"
  "$MSFA_ROOT/exp2.cc"
  "$MSFA_ROOT/fm_core.cc"
  "$MSFA_ROOT/fm_op_kernel.cc"
  "$MSFA_ROOT/freqlut.cc"
  "$MSFA_ROOT/lfo.cc"
  "$MSFA_ROOT/pitchenv.cc"
  "$MSFA_ROOT/sin.cc"
  "$MSFA_ROOT/porta.cpp"
  "$MSFA_ROOT/dx7note.cc"
)

COMMON_FLAGS=(
  -std=c++17
  -O3
  -DNDEBUG
  -I"$MATERIALIZED_ROOT"
  -Wall
  -Wextra
)

if [[ "$MODE" == native || "$MODE" == both ]]; then
  g++ "${COMMON_FLAGS[@]}" "$BRIDGE" "$CLI" "${SOURCES[@]}" -o "$OUTPUT_ROOT/fm1-msfa-native"
fi

if [[ "$MODE" == wasm || "$MODE" == both ]]; then
  if ! command -v em++ >/dev/null 2>&1; then
    echo "em++ is required for the WASM build." >&2
    exit 3
  fi

  em++ "${COMMON_FLAGS[@]}" "$BRIDGE" "${SOURCES[@]}" \
    --no-entry \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sEXPORT_NAME=createFm1MsfaModule \
    -sENVIRONMENT=node,web,worker \
    -sFILESYSTEM=0 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sASSERTIONS=0 \
    -sEXPORTED_FUNCTIONS='["_malloc","_free","_fm1_msfa_render","_fm1_msfa_session_create","_fm1_msfa_session_destroy","_fm1_msfa_session_load_patch","_fm1_msfa_session_configure_performance","_fm1_msfa_session_set_pitch_bend","_fm1_msfa_session_set_modulation","_fm1_msfa_session_set_aftertouch","_fm1_msfa_session_note_on","_fm1_msfa_session_note_off","_fm1_msfa_session_all_notes_off","_fm1_msfa_session_render64","_fm1_msfa_session_is_playing","_fm1_msfa_block_size","_fm1_msfa_patch_length"]' \
    -sEXPORTED_RUNTIME_METHODS='["HEAPU8","HEAPF32"]' \
    -o "$OUTPUT_ROOT/fm1-msfa.mjs"
fi
