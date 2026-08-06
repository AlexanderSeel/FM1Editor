import { dirname, isAbsolute, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Resolves a catalog-relative output path using file-URL semantics first, then
 * converts it to the native filesystem path. This is required on Windows,
 * where URL.pathname is `/C:/...` and must not be passed to path.dirname().
 */
export function resolveCatalogOutputFile(outputRoot, relativePath) {
  if (!(outputRoot instanceof URL) || outputRoot.protocol !== 'file:') {
    throw new TypeError('Catalog output root must be a file URL.')
  }
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new TypeError('Catalog output path must be a non-empty string.')
  }

  const rootPath = fileURLToPath(outputRoot)
  const url = new URL(relativePath, outputRoot)
  if (url.protocol !== 'file:') throw new Error('Catalog output path must resolve to a file URL.')

  const path = fileURLToPath(url)
  const pathFromRoot = relative(rootPath, path)
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(pathFromRoot)) {
    throw new Error(`Catalog output path escapes the output root: ${relativePath}`)
  }

  return {
    url,
    path,
    directory: dirname(path),
  }
}
