#!/usr/bin/env bash
set +e

OUT_DIR="${1:-/workspace/.spiegelib-reproduction}"
mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/execution.log"
FREEZE="$OUT_DIR/freeze.txt"
STATUS="$OUT_DIR/status.json"
: >"$LOG"
: >"$FREEZE"

run() {
  echo "=== $1 ===" | tee -a "$LOG"
  shift
  "$@" 2>&1 | tee -a "$LOG"
  return ${PIPESTATUS[0]}
}

run bootstrap apt-get update
bootstrap=$?
if [ "$bootstrap" -eq 0 ]; then
  run install_git apt-get install -y --no-install-recommends git ca-certificates build-essential
  install_git=$?
else
  install_git=99
fi

if [ "$install_git" -eq 0 ]; then
  run clone git clone --filter=blob:none https://github.com/hjdeheer/spiegelib.git /tmp/spiegelib
  clone=$?
else
  clone=99
fi

if [ "$clone" -eq 0 ]; then
  run checkout git -C /tmp/spiegelib checkout --detach 1a3fa1a172c89b869928005874071d0220fc9ccc
  checkout=$?
else
  checkout=99
fi

if [ "$checkout" -eq 0 ]; then
  test "$(git -C /tmp/spiegelib rev-parse HEAD)" = "1a3fa1a172c89b869928005874071d0220fc9ccc"
  pin=$?
  grep -q 'MIT License' /tmp/spiegelib/LICENSE
  license=$?
  grep -q 'From Sound2Synth' /tmp/spiegelib/src/spiegelib/estimator/conv_s2s.py \
    && grep -q 'From Sound2Synth' /tmp/spiegelib/src/spiegelib/estimator/linear.py \
    && grep -q 'From Sound2Synth' /tmp/spiegelib/src/spiegelib/estimator/lstm_s2s.py
  provenance=$?
else
  pin=99
  license=99
  provenance=99
fi

run pip_bootstrap python -m pip install --upgrade 'pip<24' 'setuptools<68' 'wheel<0.42'
pip_bootstrap=$?

if [ "$checkout" -eq 0 ] && [ "$pip_bootstrap" -eq 0 ]; then
  run editable_install python -m pip install -e /tmp/spiegelib
  editable_install=$?
else
  editable_install=99
fi

if [ "$editable_install" -eq 0 ]; then
  python - <<'PY' 2>&1 | tee -a "$LOG"
import json
import sys

import spiegelib
import spiegelib.core.audio_buffer
import spiegelib.estimator

blocked = [
    'spiegelib.estimator.conv_s2s',
    'spiegelib.estimator.linear',
    'spiegelib.estimator.lstm_s2s',
]
imported = [name for name in blocked if name in sys.modules]
if imported:
    raise RuntimeError('Blocked Sound2Synth-derived modules were imported: ' + ', '.join(imported))

versions = {'blockedModulesImported': imported}
for name in ('numpy', 'scipy', 'numba', 'tensorflow'):
    module = __import__(name)
    versions[name] = getattr(module, '__version__', 'imported')
print('SPIEGELIB_IMPORTS=' + json.dumps(versions, sort_keys=True))
PY
  imports=${PIPESTATUS[0]}
  python -m pip freeze | sort >"$FREEZE" 2>>"$LOG"
else
  imports=99
fi

export bootstrap install_git clone checkout pin license provenance pip_bootstrap editable_install imports
python - "$STATUS" <<'PY'
import json
import os
import sys

keys = [
    'bootstrap', 'install_git', 'clone', 'checkout', 'pin', 'license',
    'provenance', 'pip_bootstrap', 'editable_install', 'imports',
]
status = {key: int(os.environ.get(key, '99')) for key in keys}
status['ok'] = all(value == 0 for value in status.values())
with open(sys.argv[1], 'w', encoding='utf-8') as handle:
    json.dump(status, handle, indent=2, sort_keys=True)
    handle.write('\n')
PY

# Research reproduction always returns control so the outer workflow can persist negative evidence.
exit 0
