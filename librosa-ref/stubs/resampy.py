class _Filters:
    @staticmethod
    def get_filter(name):
        # Librosa 0.7.2 reads only element 2 here to cache an import-time
        # bandwidth constant. The value is irrelevant because this oracle
        # never calls resampling; return a finite placeholder only so the
        # unrelated audio module can import.
        return (None, None, 1.0)
filters = _Filters()
def resample(*args, **kwargs):
    raise RuntimeError('resampling intentionally unavailable in the 44.1 kHz MFCC oracle')
