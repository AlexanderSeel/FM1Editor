# Stock-DX7 recovery-bank artifact binding

Validation PR: **#5 — Bind stock-DX7 recovery evidence to exact SysEx artifact**  
Final PR head: `c627749a80af622e2b0eb38b3122f562fe84e557`  
Merged to `main`: `08a8ff5a43e9538046092961a7fb4380f36ed0d4`

Software acceptance: **SUCCESS**

## Integrity gap closed

The stock-DX7 hardware evidence manifest already required `identity.recoveryBankSha256` before destructive bank testing. Previously the consistency validator only checked that this field looked like a valid SHA-256. A manifest could therefore name a recovery bank identity without the selected evidence set containing the actual recovery `.syx` file.

This acceptance closes that repository-side ambiguity without claiming that physical recovery succeeded.

## Accepted behavior

For a stock-DX7 manifest with a valid `recoveryBankSha256`, `fm1-editor.physical-evidence-consistency.v1` now requires the selected evidence set to contain exactly one `.syx` artifact with that exact SHA-256.

- zero matching `.syx` artifacts produces `dx7-recovery-bank-artifact-missing`;
- more than one matching `.syx` artifact produces `dx7-recovery-bank-artifact-ambiguous`;
- exactly one match records `matchedRecoveryBankSysexName` and `matchedRecoveryBankSysexSha256` on the manifest/raw-MIDI correlation link;
- invalid recovery hashes continue to fail with the existing `dx7-recovery-bank-hash-invalid` error;
- raw recovery-bank payload bytes are not embedded in the exported receipt;
- the validator does not inspect musical correctness or infer that the DX7 restored successfully.

FM-1 captured-bank byte binding remains unchanged.

## Tests added

Focused tests verify:

- a valid DX7 manifest/raw-MIDI pair plus one matching recovery `.syx` is structurally consistent;
- missing recovery artifact blocks structural consistency;
- duplicate matching recovery artifacts are ambiguous and block structural consistency;
- serialized correlation metadata records the recovery artifact SHA without embedding raw MIDI event identifiers or SysEx payload bytes;
- selected MIDI port mismatches remain independently detectable.

## Executed CI evidence

### Normal repository CI

Workflow: **CI #1205**  
Run ID: `31307475922`  
Job: `validate` (`93229978444`)  
Conclusion: **SUCCESS**

| Stage | Result |
| --- | --- |
| Install dependencies | SUCCESS |
| Audit virtual DX7 source boundary | SUCCESS |
| Audit reconstruction research boundary | SUCCESS |
| Audit learned asset provenance | SUCCESS |
| Typecheck | SUCCESS |
| Lint and accessibility | SUCCESS |
| Full test suite | SUCCESS |
| Production build | SUCCESS |

### Windows Chrome/Edge browser matrix

Workflow: **Browser layout #271**  
Run ID: `31307475913`  
Job: `chrome-edge-layout` (`93229978318`)  
Conclusion: **SUCCESS**

Successful workflow stages:

- project dependency installation;
- production build;
- transient Playwright runner installation;
- desktop, compact-desktop, tablet and mobile layout checks in Chrome and Microsoft Edge for the repository-defined FM-1/DX7 browser paths.

## Boundary

This acceptance proves only that the stock-DX7 evidence manifest's declared recovery-bank SHA-256 resolves to one concrete retained `.syx` artifact in the evidence set. It does **not** prove that the recovery bank matches the pre-test contents of a physical DX7, that the device received it, that all voices were restored, or that interrupted-transfer recovery works.

The physical `bank-recovery` and related stock-DX7 `PLAN.md` checks remain open until actual hardware evidence exists.
