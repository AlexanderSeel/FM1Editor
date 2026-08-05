export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const copy = Uint8Array.from(bytes)
  const blob = new Blob([copy.buffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
