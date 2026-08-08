class _Filters:
    @staticmethod
    def get_filter(name): return (None,None,1.0)
filters=_Filters()
def resample(*args,**kwargs): raise RuntimeError('resampling intentionally unavailable in 44.1 kHz oracle')
