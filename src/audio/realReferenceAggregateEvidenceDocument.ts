import type { RealReferenceBenchmarkAggregate, RealReferenceMetricStats } from './realReferenceBenchmarkAggregate'

export function serializeRealReferenceBenchmarkAggregate(aggregate: RealReferenceBenchmarkAggregate): string {
  return `${JSON.stringify(aggregate, null, 2)}\n`
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function sha256Utf8(
  value: string,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string> {
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value))
  return hex(digest)
}

export async function hashRealReferenceBenchmarkAggregate(
  aggregate: RealReferenceBenchmarkAggregate,
  subtle?: SubtleCrypto,
): Promise<string> {
  return sha256Utf8(serializeRealReferenceBenchmarkAggregate(aggregate), subtle)
}

function metric(stats: RealReferenceMetricStats | null): string {
  if (!stats) return '—'
  return `${stats.median.toFixed(5)} (${stats.minimum.toFixed(5)}–${stats.maximum.toFixed(5)})`
}

function runtime(stats: RealReferenceMetricStats | null): string {
  if (!stats) return '—'
  return `${stats.median.toFixed(1)} ms (${stats.minimum.toFixed(1)}–${stats.maximum.toFixed(1)} ms)`
}

function safeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ').trim()
}

export function buildRealReferenceAggregateEvidenceMarkdown(
  aggregate: RealReferenceBenchmarkAggregate,
  aggregateSha256: string,
): string {
  if (!aggregate.closureReadiness.readyForAggregateEvidence) {
    throw new Error('Aggregate evidence is not closure-ready. Complete the current three-way 2+2+2 set and both listening assessments first.')
  }
  if (!/^[0-9a-f]{64}$/i.test(aggregateSha256)) throw new Error('Aggregate SHA-256 must contain exactly 64 hexadecimal characters.')

  const lines = [
    '# Real-reference reconstruction benchmark evidence',
    '',
    `Aggregate schema: \`${aggregate.schema}\`  `,
    `Aggregate created: \`${aggregate.createdAt}\`  `,
    `Aggregate JSON SHA-256: \`${aggregateSha256.toLowerCase()}\`  `,
    `Retained receipts: **${aggregate.receiptCount}**`,
    '',
    '## Closure readiness',
    '',
    `- FM-friendly electronic: **${aggregate.categoryCounts['fm-friendly-electronic']}**`,
    `- Pitched acoustic: **${aggregate.categoryCounts['pitched-acoustic']}**`,
    `- Difficult transient/noisy/nonlinear: **${aggregate.categoryCounts['difficult-transient-noisy']}**`,
    `- Current successful learned rows: **${aggregate.learnedInitializationSuccessCount}/${aggregate.receiptCount}**`,
    `- Reproducible exact-winner audition receipts: **${aggregate.auditionEvidenceReceiptCount}/${aggregate.receiptCount}**`,
    `- Retrieval/CMA listening assessments complete: **${aggregate.closureReadiness.listeningAssessmentsComplete ? 'yes' : 'no'}**`,
    `- Learned listening assessments complete: **${aggregate.closureReadiness.learnedListeningAssessmentsComplete ? 'yes' : 'no'}**`,
    `- Current three-way set complete: **${aggregate.closureReadiness.currentThreeWayComplete ? 'yes' : 'no'}**`,
    `- Exact per-reference receipt SHA-256 bindings: **${aggregate.receiptIntegrityCount}/${aggregate.receiptCount}**`,
    `- Receipt integrity complete: **${aggregate.closureReadiness.receiptIntegrityComplete ? 'yes' : 'no'}**`,
    '',
    '## Distance and runtime summary',
    '',
    '| Approach | Distance median (range) | Runtime median (range) |',
    '| --- | ---: | ---: |',
    `| Retrieval | ${metric(aggregate.retrievalDistance)} | ${runtime(aggregate.retrievalRuntimeMs)} |`,
    `| Seeded constrained CMA-ES | ${metric(aggregate.evolutionaryDistance)} | ${runtime(aggregate.evolutionaryRuntimeMs)} |`,
    `| SpiegeLib learned initialization | ${metric(aggregate.learnedDistance)} | ${runtime(aggregate.learnedRuntimeMs)} |`,
    '',
    '## Comparative outcomes',
    '',
    `- CMA improved the numerical metric: **${aggregate.cmaMetricImprovedCount}/${aggregate.receiptCount}** (${Math.round(aggregate.cmaMetricImprovedRate * 100)}%).`,
    `- Retrieval/CMA listening preferred CMA: **${aggregate.cmaListeningBetterCount}/${aggregate.receiptCount}**.`,
    `- CMA metric improved without a matching “CMA sounds better” verdict: **${aggregate.metricImprovedButListeningNotBetterCount}** case(s).`,
    `- Learned listening: best **${aggregate.learnedListeningCounts['learned-better']}**, similar **${aggregate.learnedListeningCounts['learned-similar']}**, worse **${aggregate.learnedListeningCounts['learned-worse']}**, poor/out-of-scope **${aggregate.learnedListeningCounts['learned-poor']}**.`,
    `- Learned execution: success **${aggregate.learnedInitializationSuccessCount}**, unavailable **${aggregate.learnedInitializationUnavailableCount}**, failed **${aggregate.learnedInitializationFailedCount}**.`,
    '',
    '## Retained receipts',
    '',
    '| Reference | Reference SHA-256 | Receipt SHA-256 | Class | Retrieval | CMA | Learned | Exact winners | Retrieval/CMA listening | Learned listening | Notes |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |',
  ]

  for (const receipt of aggregate.receipts) {
    lines.push(`| ${safeCell(receipt.filename)} | \`${receipt.referenceSha256}\` | ${receipt.receiptSha256 === null ? '—' : `\`${receipt.receiptSha256}\``} | ${receipt.category} | ${receipt.retrievalDistance.toFixed(5)} | ${receipt.evolutionaryDistance.toFixed(5)} | ${receipt.learnedDistance === null ? '—' : receipt.learnedDistance.toFixed(5)} | ${receipt.auditionEvidenceComplete ? 'yes' : 'no'} | ${receipt.listeningAssessment} | ${receipt.learnedListeningAssessment} | ${safeCell(receipt.notes ?? '')} |`)
  }

  lines.push(
    '',
    '## Interpretation boundary',
    '',
    'This evidence compares local reconstruction approaches for user-declared isolated reference sounds. It does not prove original patch identity, exact reconstruction, learned-model superiority, or physical FM-1 equivalence. The admitted SpiegeLib initializer predicts nine historical Dexed OP2 controls over a fixed training base; poor and out-of-scope results are retained as evidence.',
    '',
    'The aggregate JSON and this document contain hashes, classifications, metrics, runtimes, exact-winner provenance flags, listening assessments and notes only. The semantic winner voices remain in the per-reference receipts for reproducible audition and are not copied into the aggregate. Raw reference audio is not embedded.',
    '',
  )
  return lines.join('\n')
}

export async function createRealReferenceAggregateEvidenceMarkdown(
  aggregate: RealReferenceBenchmarkAggregate,
  subtle?: SubtleCrypto,
): Promise<{ readonly aggregateJson: string; readonly aggregateSha256: string; readonly markdown: string }> {
  const aggregateJson = serializeRealReferenceBenchmarkAggregate(aggregate)
  const aggregateSha256 = await sha256Utf8(aggregateJson, subtle)
  return {
    aggregateJson,
    aggregateSha256,
    markdown: buildRealReferenceAggregateEvidenceMarkdown(aggregate, aggregateSha256),
  }
}
