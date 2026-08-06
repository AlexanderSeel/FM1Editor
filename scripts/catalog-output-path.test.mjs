import { describe, expect, it } from 'vitest'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveCatalogOutputFile } from './catalog-output-path.mjs'

function directoryUrl(path) {
  return pathToFileURL(path.endsWith(sep) ? path : `${path}${sep}`)
}

describe('catalog output path resolution', () => {
  it('converts file URLs to native nested filesystem paths', () => {
    const rootPath = join(process.cwd(), 'public', 'catalog')
    const output = resolveCatalogOutputFile(
      directoryUrl(rootPath),
      'yamaha-black-boxes/factory/rom1a.syx',
    )

    expect(output.path).toBe(join(rootPath, 'yamaha-black-boxes', 'factory', 'rom1a.syx'))
    expect(output.directory).toBe(join(rootPath, 'yamaha-black-boxes', 'factory'))
    expect(output.url.protocol).toBe('file:')
  })

  it('does not derive native paths from URL pathname text', () => {
    const rootPath = join(process.cwd(), 'public', 'catalog')
    const output = resolveCatalogOutputFile(directoryUrl(rootPath), 'sync-manifest.json')

    expect(output.path).not.toContain(`${sep}C:${sep}C:`)
    expect(output.directory).toBe(rootPath)
  })

  it('rejects paths that escape the catalog root', () => {
    const rootPath = join(process.cwd(), 'public', 'catalog')
    expect(() => resolveCatalogOutputFile(directoryUrl(rootPath), '../outside.syx')).toThrow(/escapes the output root/i)
  })
})
