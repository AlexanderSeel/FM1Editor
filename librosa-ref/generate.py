import hashlib,json,librosa,numpy as np,scipy
sr=44100
n=np.arange(sr,dtype=np.float64);t=n/sr
e=0.55+0.35*(n/(sr-1))
y=e*(0.37*np.sin(2*np.pi*220*t)+0.23*np.sin(2*np.pi*880*t+0.17)+0.11*np.cos(2*np.pi*1760*t+0.31))
y[0]+=0.19;y[1]-=0.07;y[-2]+=0.09;y[-1]-=0.13;y=y.astype(np.float32)
mfcc=librosa.feature.mfcc(y=y,sr=sr,n_mfcc=13,n_fft=2048,hop_length=1024)
if mfcc.shape!=(13,44): raise SystemExit('unexpected shape %r'%(mfcc.shape,))
flat=mfcc.T.astype(np.float32).reshape(-1)
print(json.dumps({'schema':'fm1-editor.spiegelib-mfcc-librosa-0.7.2-reference.v1','environment':{'python':'3.7.7','numpy':np.__version__,'scipy':scipy.__version__,'librosa':librosa.__version__},'featureShape':[44,13],'flatFloat32Sha256':hashlib.sha256(flat.tobytes()).hexdigest(),'values':[float(v) for v in flat]},separators=(',',':')))
