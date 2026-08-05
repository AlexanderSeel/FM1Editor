# CI validation receipt

- Validation revision: `7`
- Validated commit: `75ea324309d911bb061efbded99617f34b70ad30`
- Node: `v22.23.1`
- npm install: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **FAIL (1)**
- npm run test: **PASS**
- npm run build: **PASS**

Expected archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

Actual archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

## install output

```text

added 317 packages in 19s

```

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false


```

## lint output

```text

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts


/home/runner/work/FM1Editor/FM1Editor/src/components/PatchCatalogBrowser.tsx
  67:10  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/FM1Editor/FM1Editor/src/components/PatchCatalogBrowser.tsx:67:10
  65 |
  66 |   useEffect(() => {
> 67 |     void loadCatalog()
     |          ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  68 |   }, [])
  69 |
  70 |   useEffect(() => setPage(0), [availability, includeDiagnostics, query, source])                                                                                                                            react-hooks/set-state-in-effect
  70:19  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/FM1Editor/FM1Editor/src/components/PatchCatalogBrowser.tsx:70:19
  68 |   }, [])
  69 |
> 70 |   useEffect(() => setPage(0), [availability, includeDiagnostics, query, source])
     |                   ^^^^^^^ Avoid calling setState() directly within an effect
  71 |
  72 |   const sources = useMemo(
  73 |     () => Array.from(new Set(catalog?.entries.map((entry) => entry.source) ?? [])).sort((left, right) => left.localeCompare(right)),  react-hooks/set-state-in-effect

/home/runner/work/FM1Editor/FM1Editor/src/components/VirtualPiano.tsx
  158:5  error  Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element  jsx-a11y/no-static-element-interactions
  163:7  error  `tabIndex` should only be declared on interactive elements                                                                                                                                         jsx-a11y/no-noninteractive-tabindex

/home/runner/work/FM1Editor/FM1Editor/src/components/VoiceAuditionPanel.tsx
   55:24  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/FM1Editor/FM1Editor/src/components/VoiceAuditionPanel.tsx:55:24
  53 |     if (selectionVersion === lastSelectionVersionRef.current) return
  54 |     lastSelectionVersionRef.current = selectionVersion
> 55 |     if (autoPush) void pushVoice(true)
     |                        ^^^^^^^^^ Avoid calling setState() directly within an effect
  56 |   }, [autoPush, pushVoice, selectionVersion])
  57 |
  58 |   return (  react-hooks/set-state-in-effect
   91:9   error  A form label must have accessible text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 jsx-a11y/label-has-associated-control
  107:9   error  A form label must have accessible text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 jsx-a11y/label-has-associated-control

/home/runner/work/FM1Editor/FM1Editor/src/hooks/useMidi.ts
  51:27  error  Error: Expected the first argument to be an inline function expression

Expected the first argument to be an inline function expression.

/home/runner/work/FM1Editor/FM1Editor/src/hooks/useMidi.ts:51:27
  49 |
  50 | export function useMidi() {
> 51 |   const support = useMemo(getMidiSupport, [])
     |                           ^^^^^^^^^^^^^^ Expected the first argument to be an inline function expression
  52 |   const [access, setAccess] = useState<MIDIAccess | null>(null)
  53 |   const [permission, setPermission] = useState<MidiPermissionState>('idle')
  54 |   const [inputs, setInputs] = useState<MidiPortInfo[]>([])  react-hooks/use-memo

/home/runner/work/FM1Editor/FM1Editor/src/hooks/usePatchLibrary.ts
  53:10  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/FM1Editor/FM1Editor/src/hooks/usePatchLibrary.ts:53:10
  51 |
  52 |   useEffect(() => {
> 53 |     void reload()
     |          ^^^^^^ Avoid calling setState() directly within an effect
  54 |   }, [reload])
  55 |
  56 |   const importVoices = useCallback(async (  react-hooks/set-state-in-effect

/home/runner/work/FM1Editor/FM1Editor/src/sysex/dx7.ts
  62:14  error  Unexpected control character(s) in regular expression: \x00, \x1f  no-control-regex

✖ 10 problems (10 errors, 0 warnings)


```

## test output

```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 65[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 284[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m      Tests [22m [1m[32m40 passed[39m[22m[90m (40)[39m
[2m   Start at [22m 09:53:58
[2m   Duration [22m 1.32s[2m (transform 379ms, setup 0ms, import 735ms, tests 560ms, environment 2ms)[22m


```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2Ktransforming...✓ 55 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.55 kB │ gzip:  0.34 kB
dist/assets/index-DDT8VE7t.css   36.92 kB │ gzip:  7.04 kB
dist/assets/index-A4RsAX4u.js   302.83 kB │ gzip: 92.15 kB

[32m✓ built in 208ms[39m

```
