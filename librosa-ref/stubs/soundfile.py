class SoundFileRuntimeError(RuntimeError): pass
class SoundFile:
    def __init__(self,*args,**kwargs): raise SoundFileRuntimeError('native audio IO intentionally unavailable')
def read(*args,**kwargs): raise SoundFileRuntimeError('native audio IO intentionally unavailable')
def write(*args,**kwargs): raise SoundFileRuntimeError('native audio IO intentionally unavailable')
