import { readFile } from 'node:fs/promises'

const path = new URL('../docs/research/audio-reconstruction-upstreams.json', import.meta.url)
const manifest = JSON.parse(await readFile(path, 'utf8'))

if (manifest.schema !== 'fm1-editor.audio-reconstruction-upstreams.v1') throw new Error('Unexpected reconstruction-upstream schema.')
if (!Array.isArray(manifest.entries) || manifest.entries.length < 5) throw new Error('Expected the reviewed reconstruction upstream set.')

const ids = new Set()
for (const entry of manifest.entries) {
  if (!entry.id || ids.has(entry.id)) throw new Error(`Invalid or duplicate upstream id ${entry.id}`)
  ids.add(entry.id)
  if (!/^[^/]+\/[^/]+$/.test(entry.repository ?? '')) throw new Error(`${entry.id}: invalid repository identity`)
  if (!/^[0-9a-f]{40}$/.test(entry.commit ?? '')) throw new Error(`${entry.id}: commit must be a full immutable SHA`)
  if (entry.productionAdmitted !== false) throw new Error(`${entry.id}: external reconstruction runtime must remain unadmitted until a dedicated admission gate exists`)
  if (!entry.status) throw new Error(`${entry.id}: status missing`)
  if (entry.codeLicense === undefined) throw new Error(`${entry.id}: codeLicense must be explicit, including null when absent`)
}

const sound2Synth = manifest.entries.find((entry) => entry.id === 'sound2synth-core')
if (sound2Synth?.codeLicense !== null || sound2Synth?.status !== 'blocked-license') throw new Error('Sound2Synth core must remain blocked while no explicit code license is established.')

const plugin = manifest.entries.find((entry) => entry.id === 'sound2synth-dexed-plugin')
if (plugin?.codeLicense !== 'GPL-3.0') throw new Error('Sound2Synth Dexed wrapper must retain GPL-3.0 classification.')

for (const id of ['ddx7', 'magenta-ddsp']) {
  const entry = manifest.entries.find((candidate) => candidate.id === id)
  if (entry?.codeLicense !== 'Apache-2.0') throw new Error(`${id}: expected Apache-2.0 source classification`)
}

process.stdout.write(`Reconstruction upstream manifest verified: ${manifest.entries.length} pinned research entries, 0 production admissions.\n`)
