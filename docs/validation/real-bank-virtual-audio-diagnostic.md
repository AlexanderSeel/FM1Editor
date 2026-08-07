# Real bundled-bank virtual audio diagnostic

Source commit: `f26c176f52bb05042e284a8b919692b41ffdae56`

Offline real-bank render: **FAILED**

This diagnostic renders the first eight voices from the first valid 32-voice bank in the tracked `public/catalog/sysexFinal.zip` through the packaged MSFA WASM using the same semantic decoder and bridge as the browser local-audio path.

```text

> fm1-editor@0.1.0 test
> vitest run src/audio/libraryVoiceRender.integration.test.ts


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [31m❯[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 106[2mms[22m[39m
[31m     [31m×[31m renders audible PCM from decoded packed-bank voices through the packaged engine[39m[32m 105[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/libraryVoiceRender.integration.test.ts[2m > [22mreal catalog voice rendering[2m > [22mrenders audible PCM from decoded packed-bank voices through the packaged engine
[31m[1mDx7SysexError[22m: The file does not contain a complete SysEx message.[39m
[36m [2m❯[22m extractSysexMessages src/sysex/importSysex.ts:[2m299:43[22m[39m
    [90m297|[39m   )
    [90m298|[39m   [35mif[39m (fatal) [35mthrow[39m [35mnew[39m [33mDx7SysexError[39m(fatal[33m.[39mmessage)
    [90m299|[39m   if (report.messages.length === 0) throw new Dx7SysexError('The file …
    [90m   |[39m                                           [31m^[39m
    [90m300|[39m   [35mreturn[39m report[33m.[39mmessages[33m.[39m[34mmap[39m((message) [33m=>[39m message[33m.[39mraw)
    [90m301|[39m }
[90m [2m❯[22m importSysexFile src/sysex/importSysex.ts:[2m304:3[22m[39m
[90m [2m❯[22m firstRealBankVoices src/audio/libraryVoiceRender.integration.test.ts:[2m22:20[22m[39m
[90m [2m❯[22m src/audio/libraryVoiceRender.integration.test.ts:[2m37:34[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m   Start at [22m 12:54:27
[2m   Duration [22m 414ms[2m (transform 144ms, setup 0ms, import 177ms, tests 106ms, environment 0ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/importSysex.ts,title=src/audio/libraryVoiceRender.integration.test.ts > real catalog voice rendering > renders audible PCM from decoded packed-bank voices through the packaged engine,line=299,column=43::Dx7SysexError: The file does not contain a complete SysEx message.%0A ❯ extractSysexMessages src/sysex/importSysex.ts:299:43%0A ❯ importSysexFile src/sysex/importSysex.ts:304:3%0A ❯ firstRealBankVoices src/audio/libraryVoiceRender.integration.test.ts:22:20%0A ❯ src/audio/libraryVoiceRender.integration.test.ts:37:34%0A%0A

```
