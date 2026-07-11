import { describe, expect, it } from 'vitest'
import {
  addPianoNote,
  cloneDrumPattern,
  DEFAULT_DRUM_PATTERN,
  DEFAULT_PIANO_PATTERN,
  extensionForMimeType,
  formatTimer,
  recordingFilename,
  toggleDrumStep,
  togglePianoStep,
  volumeToGain,
} from './music'

describe('pattern helpers', () => {
  it('toggles one drum step without mutating the source pattern', () => {
    const source = cloneDrumPattern(DEFAULT_DRUM_PATTERN)
    const wasOn = source.kick[0]
    const next = toggleDrumStep(source, 'kick', 0)
    expect(next.kick[0]).toBe(!wasOn)
    expect(source.kick[0]).toBe(wasOn)
    expect(next.snare).not.toBe(source.snare)
  })

  it('adds and removes a piano note from a selected step', () => {
    const source = DEFAULT_PIANO_PATTERN.map((notes) => [...notes])
    const added = togglePianoStep(source, 1, 'F4')
    expect(added[1]).toContain('F4')
    expect(togglePianoStep(added, 1, 'F4')[1]).not.toContain('F4')
  })

  it('does not duplicate a quantized live note', () => {
    const source = DEFAULT_PIANO_PATTERN.map((notes) => [...notes])
    const once = addPianoNote(source, 2, 'G4')
    const twice = addPianoNote(once, 2, 'G4')
    expect(twice[2]).toEqual(['G4'])
  })
})

describe('audio control helpers', () => {
  it('maps volume to a perceptual gain curve', () => {
    expect(volumeToGain(0)).toBe(0)
    expect(volumeToGain(50)).toBeCloseTo(0.25)
    expect(volumeToGain(100)).toBe(1)
  })

  it('formats a stable recording timer', () => {
    expect(formatTimer(-1)).toBe('00:00')
    expect(formatTimer(65_999)).toBe('01:05')
  })

  it('chooses an extension from the browser recording MIME type', () => {
    expect(extensionForMimeType('audio/ogg;codecs=opus')).toBe('ogg')
    expect(extensionForMimeType('audio/mp4')).toBe('m4a')
    expect(extensionForMimeType('audio/webm')).toBe('webm')
  })

  it('builds a filesystem-safe timestamped filename', () => {
    const filename = recordingFilename(new Date('2026-07-11T12:34:56.000Z'), 'audio/webm')
    expect(filename).toBe('beatmaker-2026-07-11T12-34-56.webm')
  })
})
