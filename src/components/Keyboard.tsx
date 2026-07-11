import { KEYBOARD_MAP, KEYBOARD_NOTES } from '../lib/music'

interface KeyboardProps {
  pressedNotes: Set<string>
  onAttack: (note: string) => void
  onRelease: (note: string) => void
}

const whiteNotes = KEYBOARD_NOTES.filter((note) => !note.includes('#'))
const blackOffsets: Record<string, number> = {
  'C#4': 10.6,
  'D#4': 24.9,
  'F#4': 53.5,
  'G#4': 67.8,
  'A#4': 82.1,
}

function keyForNote(note: string) {
  return Object.entries(KEYBOARD_MAP).find(([, mappedNote]) => mappedNote === note)?.[0]
}

export function Keyboard({ pressedNotes, onAttack, onRelease }: KeyboardProps) {
  return (
    <div className="keyboard" aria-label="Playable piano keyboard">
      <div className="white-keys">
        {whiteNotes.map((note) => (
          <button
            type="button"
            key={note}
            className={`piano-key white-key ${pressedNotes.has(note) ? 'is-pressed' : ''}`}
            aria-label={`Play ${note}`}
            aria-pressed={pressedNotes.has(note)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              onAttack(note)
            }}
            onPointerUp={() => onRelease(note)}
            onPointerCancel={() => onRelease(note)}
          >
            <span>{note.replace('4', '')}</span>
            <kbd>{keyForNote(note)?.toUpperCase()}</kbd>
          </button>
        ))}
      </div>
      {KEYBOARD_NOTES.filter((note) => note.includes('#')).map((note) => (
        <button
          type="button"
          key={note}
          className={`piano-key black-key ${pressedNotes.has(note) ? 'is-pressed' : ''}`}
          style={{ left: `${blackOffsets[note]}%` }}
          aria-label={`Play ${note}`}
          aria-pressed={pressedNotes.has(note)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            onAttack(note)
          }}
          onPointerUp={() => onRelease(note)}
          onPointerCancel={() => onRelease(note)}
        >
          <kbd>{keyForNote(note)?.toUpperCase()}</kbd>
        </button>
      ))}
    </div>
  )
}
