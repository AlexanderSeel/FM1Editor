import hashlib, json
from pathlib import Path
import librosa, numpy as np, scipy
sr = 44100
n = np.arange(sr, dtype=np.float64)
t = n / sr
envelope = 0.55 + 0.35 * (n / (sr - 1))
signal = envelope * (
    0.37 * np.sin(2 * np.pi * 220 * t)
    + 0.23 * np.sin(2 * np.pi * 880 * t + 0.17)
    + 0.11 * np.cos(2 * np.pi * 1760 * t + 0.31)
)
signal[0] += 0.19; signal[1] -= 0.07; signal[-2] += 0.09; signal[-1] -= 0.13
signal = signal.astype(np.float32)
mfcc = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=13, n_fft=2048, hop_length=1024)
if mfcc.shape != (13, 44): raise SystemExit('unexpected MFCC shape: %r' % (mfcc.shape,))
flat = mfcc.T.astype(np.float32).reshape(-1)
payload = {
    'schema': 'fm1-editor.spiegelib-mfcc-librosa-0.7.2-reference.v1',
    'environment': {'python':'3.7.7','numpy':np.__version__,'scipy':scipy.__version__,'librosa':librosa.__version__},
    'signal': {'sampleRate':sr,'sampleCount':int(signal.size),'formula':'documented deterministic multi-sine/envelope/edge-impulse fixture'},
    'featureShape':[44,13],
    'flatFloat32Sha256': hashlib.sha256(flat.tobytes(order='C')).hexdigest(),
    'values':[float(v) for v in flat],
}
Path('/output/reference.json').write_text(json.dumps(payload, separators=(',', ':'))+'\n', encoding='utf-8')
print(json.dumps({k:payload[k] for k in ('environment','featureShape','flatFloat32Sha256')}, indent=2))
