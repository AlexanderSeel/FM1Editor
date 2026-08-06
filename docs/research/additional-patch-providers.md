# Additional DX7 patch-provider review

Last reviewed: 2026-08-06

## Admission criteria

An additional built-in catalog provider may be added only when all of the following are true:

1. The catalog has a stable, versionable machine-readable index, package or direct-file layout.
2. Redistribution and in-application use of the patch data are covered by explicit terms that apply to the data itself, not only to surrounding source code.
3. Patch provenance and required attribution can be retained per bank or per collection.
4. Entries resolve to standard DX7 single-voice or 32-voice SysEx, or to a documented representation that can be converted without semantic guessing.
5. Synchronization does not depend on authenticated browser sessions, scraping unstable presentation markup or bypassing access controls.
6. Downloaded content can be size-, format-, checksum- and hash-validated before it is exposed in the catalog.

A repository-level software license is not sufficient when the README says the included presets originated in third-party archives. Public availability is also not equivalent to permission to redistribute.

## Candidates reviewed

### `itsjoesullivan/dx7-patches`

Repository:

- https://github.com/itsjoesullivan/dx7-patches

Positive findings:

- machine-readable JSON files;
- bank/patch directory structure;
- documented JSON shape;
- published as the `dx7-patches` npm package.

Blocking findings:

- no repository license was displayed in the reviewed root listing;
- the README says the collection was compiled by Glenn Scott and retrieved from older UCSD/Dave Benson archives;
- no terms were found that explicitly grant redistribution of the underlying patch data inside another hosted catalog.

Decision: **no adapter**. The format is technically usable, but the data-rights boundary is not explicit enough.

### `Caskexe/DX`

Repository:

- https://github.com/Caskexe/DX

Positive findings:

- repository declares the Unlicense;
- files are organized as downloadable DX-related soundbanks.

Blocking findings:

- the README states that many presets were sourced from multiple online archives;
- a repository-level Unlicense declaration does not establish that the repository owner controls or can relicense every third-party source patch;
- the repository is oriented toward converted soundbanks rather than a stable raw DX7 SysEx catalog contract.

Decision: **no adapter**. The repository license does not remove the stated third-party provenance ambiguity.

### `patches.fm`

Site:

- https://patches.fm/

Positive findings:

- searchable DX7-oriented patch experience;
- individual downloads and browser-based preview/transfer features.

Blocking findings:

- no public, documented, versioned catalog API was found during this review;
- no redistribution terms for mirroring the complete patch catalog were found;
- integrating through presentation-page scraping would not satisfy the stability requirement.

Decision: **no adapter** unless the provider publishes an API/data feed and explicit catalog-use terms.

## Current decision

No additional provider qualifies at this time. FM1 Editor should retain the tracked `sysexFinal.zip` source and Yamaha Black Boxes overlay already described in [`patch-catalog.md`](./patch-catalog.md).

The plan item remains unresolved by design. A future candidate should be evaluated against the admission criteria above before implementation begins.
