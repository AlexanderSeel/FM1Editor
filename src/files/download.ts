function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const copy = Uint8Array.from(bytes)
  downloadBlob(new Blob([copy.buffer], { type: 'application/octet-stream' }), filename)
}

export function downloadText(
  text: string,
  filename: string,
  mimeType = 'application/json',
): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename)
}
