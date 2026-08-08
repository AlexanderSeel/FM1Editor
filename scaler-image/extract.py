import json,sys
import joblib,numpy as np
scaler=joblib.load('/input/data_scaler.pkl')
mean=np.asarray(scaler.mean,dtype=np.float64);std=np.asarray(scaler.std,dtype=np.float64)
fit_axis=scaler.fit_axis;fit_shape=tuple(int(v) for v in scaler.fit_shape)
if mean.shape!=(44,13) or std.shape!=(44,13): raise SystemExit(f'unexpected mean/std shape {mean.shape}/{std.shape}')
if fit_axis!=(0,): raise SystemExit(f'unexpected fit_axis {fit_axis!r}')
if fit_shape!=(10,44,13): raise SystemExit(f'unexpected archived fit_shape {fit_shape}')
if not np.isfinite(mean).all() or not np.isfinite(std).all() or not (std>0).all(): raise SystemExit('invalid scaler values')
payload={'schema':'fm1-editor.spiegelib-simple-fm-mfcc-scaler.v1','source':{'doi':'10.5281/zenodo.3722784','archive':'data_simple_FM_mfcc.zip','archiveMd5':'7c9357219b70c07a4ab115d332f78ef5','member':'data_simple_FM_mfcc/data_scaler.pkl','memberSha256':'99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4','license':'CC-BY-4.0','creators':['Jordie Shier','George Tzanetakis','Kirk McNally']},'fitShape':list(fit_shape),'fitAxis':[0],'featureShape':[44,13],'mean':mean.tolist(),'std':std.tolist()}
sys.stdout.write(json.dumps(payload,separators=(',',':'))+'\n')
