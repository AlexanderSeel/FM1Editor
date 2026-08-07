# Importable real-bank virtual audio diagnostic

Source commit: `71bde74ce4324a05ed4fd520c55e76e03a481a11`

Offline importable-bank render: **FAILED**

The test skips malformed/diagnostic `.syx` files and selects the first actual importable 32-voice bank from the tracked archive.

```text

> fm1-editor@0.1.0 test
> vitest run src/audio/libraryVoiceRender.integration.test.ts


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.000091552734375},{"slot":2,"name":"BRASS   2","peak":0},{"slot":3,"name":"BRASS   3","peak":0.000030517578125},{"slot":4,"name":"STRINGS 1","peak":0.00030517578125},{"slot":5,"name":"STRINGS 2","peak":0},{"slot":6,"name":"STRINGS 3","peak":0.001068115234375},{"slot":7,"name":"ORCHESTRA","peak":0},{"slot":8,"name":"PIANO   1","peak":0.00006103515625}]}

 [31m❯[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 112[2mms[22m[39m
[31m     [31m×[31m renders audible PCM from decoded packed-bank voices through the packaged engine[39m[32m 110[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/libraryVoiceRender.integration.test.ts[2m > [22mreal catalog voice rendering[2m > [22mrenders audible PCM from decoded packed-bank voices through the packaged engine
[31m[1mAssertionError[22m: expected 5 to be greater than or equal to 6[39m
[36m [2m❯[22m src/audio/libraryVoiceRender.integration.test.ts:[2m65:67[22m[39m
    [90m 63|[39m     console.info('real-bank-render', JSON.stringify({ filename, result…
    [90m 64|[39m     [34mexpect[39m(results)[33m.[39m[34mtoHaveLength[39m([34m8[39m)
    [90m 65|[39m     expect(results.filter((result) => result.peak > 1e-6).length).toBe…
    [90m   |[39m                                                                   [31m^[39m
    [90m 66|[39m   })
    [90m 67|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m   Start at [22m 13:00:29
[2m   Duration [22m 340ms[2m (transform 109ms, setup 0ms, import 131ms, tests 112ms, environment 0ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/libraryVoiceRender.integration.test.ts,title=src/audio/libraryVoiceRender.integration.test.ts > real catalog voice rendering > renders audible PCM from decoded packed-bank voices through the packaged engine,line=65,column=67::AssertionError: expected 5 to be greater than or equal to 6%0A ❯ src/audio/libraryVoiceRender.integration.test.ts:65:67%0A%0A

```
