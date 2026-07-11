export const STEP_COUNT = 16

export const DRUM_VOICES = ['kick', 'snare', 'hihat'] as const
export type DrumVoice = (typeof DRUM_VOICES)[number]

export type DrumPattern = Record<DrumVoice, boolean[]>
export type PianoPattern = string[][]

export const PIANO_NOTES = [
  'B4',
  'A#4',
  'A4',
  'G#4',
  'G4',
  'F#4',
  'F4',
  'E4',
  'D#4',
  'D4',
  'C#4',
  'C4',
] as const

export const KEYBOARD_NOTES = [...PIANO_NOTES].reverse()

export const KEYBOARD_MAP: Record<string, string> = {
  a: 'C4',
  w: 'C#4',
  s: 'D4',
  e: 'D#4',
  d: 'E4',
  f: 'F4',
  t: 'F#4',
  g: 'G4',
  y: 'G#4',
  h: 'A4',
  u: 'A#4',
  j: 'B4',
}

export const DEFAULT_DRUM_PATTERN: DrumPattern = {
  kick: Array.from({ length: STEP_COUNT }, (_, step) => [0, 4, 8, 11, 14].includes(step)),
  snare: Array.from({ length: STEP_COUNT }, (_, step) => [4, 12].includes(step)),
  hihat: Array.from({ length: STEP_COUNT }, (_, step) => step % 2 === 0 || [7, 15].includes(step)),
}

export const DEFAULT_PIANO_PATTERN: PianoPattern = Array.from(
  { length: STEP_COUNT },
  (_, step) =>
    ({
      0: ['C4'],
      3: ['D#4'],
      6: ['G4'],
      8: ['A#4'],
      11: ['G4'],
      14: ['D#4'],
    })[step] ?? [],
)

export function cloneDrumPattern(pattern: DrumPattern): DrumPattern {
  return {
    kick: [...pattern.kick],
    snare: [...pattern.snare],
    hihat: [...pattern.hihat],
  }
}

export function clonePianoPattern(pattern: PianoPattern): PianoPattern {
  return pattern.map((notes) => [...notes])
}

export function toggleDrumStep(
  pattern: DrumPattern,
  voice: DrumVoice,
  step: number,
): DrumPattern {
  const next = cloneDrumPattern(pattern)
  next[voice][step] = !next[voice][step]
  return next
}

export function togglePianoStep(
  pattern: PianoPattern,
  step: number,
  note: string,
): PianoPattern {
  const next = clonePianoPattern(pattern)
  const notes = next[step]
  next[step] = notes.includes(note) ? notes.filter((value) => value !== note) : [...notes, note]
  return next
}

export function addPianoNote(pattern: PianoPattern, step: number, note: string): PianoPattern {
  if (pattern[step].includes(note)) return pattern
  const next = clonePianoPattern(pattern)
  next[step] = [...next[step], note]
  return next
}

export function volumeToGain(volume: number): number {
  if (volume <= 0) return 0
  return Math.pow(volume / 100, 2)
}

export function formatTimer(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function extensionForMimeType(type: string): string {
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('wav')) return 'wav'
  if (type.includes('mp4')) return 'm4a'
  return 'webm'
}

export function recordingFilename(date: Date, type: string): string {
  const stamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `beatmaker-${stamp}.${extensionForMimeType(type)}`
}
