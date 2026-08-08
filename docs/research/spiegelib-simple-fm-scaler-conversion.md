# SpiegeLib simple-FM MFCC scaler conversion

FM1 Editor source commit: `adf71550d9d6179bdc8a5b0c680ad235b05e7db3`

Conversion status: **SUCCESS**

- DOI: `10.5281/zenodo.3722784`
- archive MD5: `7c9357219b70c07a4ab115d332f78ef5`
- archived scaler SHA-256: `99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4`
- converted JSON SHA-256: `77494299cad04042c96574676eb9a573f534a0e83e2574683b661678b065f532`
- license: CC BY 4.0; creators: Jordie Shier, George Tzanetakis, Kirk McNally
- archived fit shape: `10 × 44 × 13`; fit axis: `0`; mean/std: `44 × 13`
- archived scaled train max |mean|: `2.7052184741478413e-08`
- archived scaled train max |std-1|: `6.013930464732198e-10`

The original joblib pickle was deserialized only in a no-network, read-only, capability-dropped Docker container with a read-only input mount and no writable mount. The plain JSON derivative was emitted over stdout and then validated on the host.

The archive reports fit_shape `(10,44,13)`. SpiegeLib uses the saved shape only to choose 3-D-batch versus 2-D-single-example broadcasting; inference uses the persisted axis-0 44×13 mean/std values.
