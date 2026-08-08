import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const modelPath = resolve(root, 'src/audio/data/spiegelib-simple-fm-mlp.json')
const scalerPath = resolve(root, 'src/audio/data/spiegelib-simple-fm-mfcc-scaler.json')
const noticePath = resolve(root, 'THIRD_PARTY_NOTICES.md')

const EXPECTED_MODEL_DERIVATIVE_SHA256 = '3dd5b9bc8ddef4fffd018a53f3b4902e9ad73afd2e1badc5f96d01600a8e44ac'
const EXPECTED_MODEL_SOURCE_SHA256 = '96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f'
const EXPECTED_MODEL_COMMIT = 'e1baab7fbeb0bc3f4d4946f8348e77dd18028080'
const EXPECTED_SCALER_SOURCE_SHA256 = '99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4'
const EXPECTED_SCALER_DOI = '10.5281/zenodo.3722784'

function fail(message) {
  throw new Error(`Learned asset audit failed: ${message}`)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (cause) {
    fail(`${label} is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`)
  }
}

if (!existsSync(modelPath)) fail('pinned SpiegeLib model JSON is missing')
if (!existsSync(noticePath)) fail('THIRD_PARTY_NOTICES.md is missing')

const modelBytes = readFileSync(modelPath)
const model = readJson(modelPath, 'SpiegeLib model')
if (sha256(modelBytes) !== EXPECTED_MODEL_DERIVATIVE_SHA256) fail('converted model JSON SHA-256 drifted')
if (model?.schema !== 'fm1-editor.spiegelib-simple-fm-mlp.v1') fail('unexpected model schema')
if (model?.source?.repository !== 'spiegelib/vst-fm-sound-match') fail('unexpected model source repository')
if (model?.source?.commit !== EXPECTED_MODEL_COMMIT) fail('unexpected pinned model commit')
if (model?.source?.sha256 !== EXPECTED_MODEL_SOURCE_SHA256) fail('unexpected source H5 SHA-256')
if (model?.source?.license !== 'MIT') fail('model license metadata must remain MIT')
if (model?.inputSize !== 572 || model?.outputSize !== 9 || !Array.isArray(model?.layers) || model.layers.length !== 4) {
  fail('model architecture metadata drifted')
}

const notice = readFileSync(noticePath, 'utf8')
for (const required of [
  'SpiegeLib simple-FM MLP weights',
  EXPECTED_MODEL_COMMIT,
  EXPECTED_MODEL_SOURCE_SHA256,
  'Copyright (c) 2020 spiegel-lib',
  'License: MIT',
  'SpiegeLib simple-FM MFCC dataset/scaler',
  EXPECTED_SCALER_DOI,
  EXPECTED_SCALER_SOURCE_SHA256,
  'Creative Commons Attribution 4.0 International',
]) {
  if (!notice.includes(required)) fail(`third-party notice is missing ${JSON.stringify(required)}`)
}

if (existsSync(scalerPath)) {
  const scaler = readJson(scalerPath, 'SpiegeLib scaler')
  if (scaler?.schema !== 'fm1-editor.spiegelib-simple-fm-mfcc-scaler.v1') fail('unexpected scaler schema')
  if (scaler?.source?.doi !== EXPECTED_SCALER_DOI) fail('unexpected scaler DOI')
  if (scaler?.source?.memberSha256 !== EXPECTED_SCALER_SOURCE_SHA256) fail('unexpected archived scaler SHA-256')
  if (scaler?.source?.license !== 'CC-BY-4.0') fail('scaler license metadata must remain CC-BY-4.0')
  if (!Array.isArray(scaler?.mean) || scaler.mean.length !== 44 || !Array.isArray(scaler?.std) || scaler.std.length !== 44) {
    fail('scaler matrix dimensions drifted')
  }
  console.log('Learned asset audit: model + scaler provenance OK')
} else {
  console.log('Learned asset audit: model provenance OK; archived scaler derivative not committed yet')
}
