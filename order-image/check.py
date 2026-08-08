import json
from pathlib import Path
config = json.loads(Path('/opt/dexed_simple_fm.json').read_text())
entries = [config[key] for key in config]
training_order = [int(entry['id']) for entry in entries if not entry['overridden']]
all_indices = [int(entry['id']) for entry in entries]
overridden = [int(entry['id']) for entry in entries if entry['overridden']]
expansion_order = list(set(all_indices) - set(overridden))
expected = [46,47,48,50,51,52,55,56,57]
result = {
    'python': '3.7.7',
    'trainingOrder': training_order,
    'expansionOrder': expansion_order,
    'expected': expected,
    'labels': [config[str(index)]['desc'] for index in expected],
}
if training_order != expected:
    raise SystemExit('training get_patch/config order mismatch: %r' % training_order)
if expansion_order != expected:
    raise SystemExit('historical expand_sub_patch set order mismatch: %r' % expansion_order)
print(json.dumps(result, separators=(',', ':')))
