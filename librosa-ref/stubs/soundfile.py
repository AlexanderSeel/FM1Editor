class SoundFileRuntimeError(RuntimeError):
    pass
class SoundFile:
    def __init__(self, *args, **kwargs):
        raise SoundFileRuntimeError('soundfile IO is intentionally unavailable in this MFCC-only oracle')
def read(*args, **kwargs):
    raise SoundFileRuntimeError('soundfile IO is intentionally unavailable in this MFCC-only oracle')
def write(*args, **kwargs):
    raise SoundFileRuntimeError('soundfile IO is intentionally unavailable in this MFCC-only oracle')
