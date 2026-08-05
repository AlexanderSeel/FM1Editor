import type { Dx7Voice } from './voice'

export function moveBankVoice(voices: readonly Dx7Voice[], from: number, to: number): readonly Dx7Voice[] {
  if (from === to || from < 0 || to < 0 || from >= voices.length || to >= voices.length) return voices
  const next = [...voices]
  const [moved] = next.splice(from, 1)
  if (!moved) return voices
  next.splice(to, 0, moved)
  return next
}
