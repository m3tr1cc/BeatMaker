import { Pause, Play, Record, SpeakerHigh, Waveform as WaveformIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard } from './components/Keyboard'
import { Knob } from './components/Knob'
import { Waveform } from './components/Waveform'
import { AudioEngine } from './lib/audio'
import {
  addPianoNote,
  cloneDrumPattern,
  clonePianoPattern,
  DEFAULT_DRUM_PATTERN,
  DEFAULT_PIANO_PATTERN,
  DRUM_VOICES,
  formatTimer,
  KEYBOARD_MAP,
  PIANO_NOTES,
  recordingFilename,
  STEP_COUNT,
  toggleDrumStep,
  togglePianoStep,
  type DrumPattern,
  type DrumVoice,
  type PianoPattern,
} from './lib/music'

const VOICE_LABELS: Record<DrumVoice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Closed hat',
}

const STEP_NUMBERS = Array.from({ length: STEP_COUNT }, (_, index) => index)

function downloadRecording(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = recordingFilename(new Date(), blob.type)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export default function App() {
  const engine = useMemo(() => new AudioEngine(), [])
  const [drums, setDrums] = useState<DrumPattern>(() => cloneDrumPattern(DEFAULT_DRUM_PATTERN))
  const [piano, setPiano] = useState<PianoPattern>(() => clonePianoPattern(DEFAULT_PIANO_PATTERN))
  const [tempo, setTempo] = useState(112)
  const [volume, setVolume] = useState(72)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [noteArmed, setNoteArmed] = useState(false)
  const [mobilePage, setMobilePage] = useState<0 | 1>(0)
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(() => new Set())
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState('Demo pattern ready')
  const snapshotRef = useRef({ drums, piano })
  const heldKeys = useRef(new Set<string>())
  const recordingStartedAt = useRef(0)
  const playingRef = useRef(isPlaying)
  const blockedRef = useRef(autoplayBlocked)

  useEffect(() => {
    snapshotRef.current = { drums, piano }
  }, [drums, piano])

  useEffect(() => {
    playingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    blockedRef.current = autoplayBlocked
  }, [autoplayBlocked])

  useEffect(() => {
    engine.setSequenceProvider(() => snapshotRef.current)
    engine.setStepListener(setCurrentStep)
    engine.setTempo(tempo)
    engine.setVolume(volume)

    engine
      .play()
      .then(() => {
        setAutoplayBlocked(false)
        setStatus('Demo playing')
      })
      .catch(() => {
        setAutoplayBlocked(true)
        setStatus('Tap anywhere to hear the beat')
      })

    return () => engine.dispose()
    // The engine is intentionally configured only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  useEffect(() => {
    engine.setTempo(tempo)
  }, [engine, tempo])

  useEffect(() => {
    engine.setVolume(volume)
  }, [engine, volume])

  useEffect(() => {
    if (!isPlaying || !window.matchMedia('(max-width: 760px)').matches) return
    setMobilePage(currentStep >= 8 ? 1 : 0)
  }, [currentStep, isPlaying])

  useEffect(() => {
    if (!autoplayBlocked || !isPlaying) return
    const interval = window.setInterval(() => {
      setCurrentStep((step) => (step + 1) % STEP_COUNT)
    }, 60_000 / tempo / 4)
    return () => window.clearInterval(interval)
  }, [autoplayBlocked, isPlaying, tempo])

  useEffect(() => {
    if (!autoplayBlocked) return
    const unlock = () => {
      if (!playingRef.current || !blockedRef.current) return
      engine
        .play()
        .then(() => {
          setAutoplayBlocked(false)
          setStatus('Demo playing')
        })
        .catch(() => setStatus('Audio is still waiting for interaction'))
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [autoplayBlocked, engine])

  useEffect(() => {
    if (!isRecording) return
    const interval = window.setInterval(() => {
      setRecordingTime(performance.now() - recordingStartedAt.current)
    }, 100)
    return () => window.clearInterval(interval)
  }, [isRecording])

  const recordLiveNote = useCallback(
    (note: string) => {
      if (!noteArmed || !playingRef.current) return
      setPiano((pattern) => addPianoNote(pattern, currentStep, note))
    },
    [currentStep, noteArmed],
  )

  const attackNote = useCallback(
    (note: string) => {
      setPressedNotes((active) => new Set(active).add(note))
      recordLiveNote(note)
      engine.attack(note).catch(() => setStatus('Tap once to enable piano audio'))
    },
    [engine, recordLiveNote],
  )

  const releaseNote = useCallback(
    (note: string) => {
      setPressedNotes((active) => {
        const next = new Set(active)
        next.delete(note)
        return next
      })
      engine.release(note)
    },
    [engine],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const note = KEYBOARD_MAP[key]
      if (!note || event.repeat || heldKeys.current.has(key)) return
      event.preventDefault()
      heldKeys.current.add(key)
      attackNote(note)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const note = KEYBOARD_MAP[key]
      if (!note) return
      heldKeys.current.delete(key)
      releaseNote(note)
    }
    const releaseAll = () => {
      heldKeys.current.clear()
      setPressedNotes(new Set())
      engine.releaseAll()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [attackNote, engine, releaseNote])

  const play = async () => {
    setIsPlaying(true)
    setStatus('Starting audio…')
    try {
      await engine.play()
      setAutoplayBlocked(false)
      setStatus('Playing')
    } catch {
      setAutoplayBlocked(true)
      setStatus('Tap again to hear the beat')
    }
  }

  const pause = () => {
    engine.pause()
    setIsPlaying(false)
    setStatus('Paused')
  }

  const toggleRecording = async () => {
    if (!engine.canRecord()) {
      setStatus('Recording is not supported in this browser')
      return
    }

    if (isRecording) {
      try {
        const blob = await engine.stopRecording()
        setIsRecording(false)
        setRecordingTime(0)
        downloadRecording(blob)
        setStatus('Recording downloaded')
      } catch {
        setStatus('Could not finish this recording')
      }
      return
    }

    try {
      if (!isPlaying) await play()
      await engine.startRecording()
      recordingStartedAt.current = performance.now()
      setRecordingTime(0)
      setIsRecording(true)
      setStatus('Recording master output')
    } catch {
      setStatus('Tap once, then try recording again')
    }
  }

  const resetPattern = () => {
    setDrums(cloneDrumPattern(DEFAULT_DRUM_PATTERN))
    setPiano(clonePianoPattern(DEFAULT_PIANO_PATTERN))
    setStatus('Demo pattern restored')
  }

  return (
    <main className="app-shell">
      <section className="instrument" aria-label="BeatMaker instrument">
        <header className="topbar">
          <div className="brand-lockup">
            <WaveformIcon weight="duotone" aria-hidden="true" />
            <div>
              <h1>BeatMaker</h1>
              <p>{status}</p>
            </div>
          </div>

          <div className="transport" aria-label="Transport controls">
            <span className={`timer ${isRecording ? 'is-recording' : ''}`} aria-live="polite">
              {formatTimer(recordingTime)}
            </span>
            <button
              type="button"
              className="transport-button play-button"
              aria-label="Play beat"
              onClick={play}
              disabled={isPlaying && !autoplayBlocked}
            >
              <Play weight="fill" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="transport-button pause-button"
              aria-label="Pause beat"
              onClick={pause}
              disabled={!isPlaying}
            >
              <Pause weight="fill" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`transport-button record-button ${isRecording ? 'is-active' : ''}`}
              aria-label={isRecording ? 'Stop and download recording' : 'Start recording'}
              aria-pressed={isRecording}
              onClick={toggleRecording}
              title={engine.canRecord() ? undefined : 'Recording is unavailable in this browser'}
            >
              <Record weight="fill" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="waveform-wrap">
          <Waveform engine={engine} isPlaying={isPlaying} currentStep={currentStep} />
          <div className="waveform-centerline" />
        </div>

        <div className="workspace">
          <aside className="controls-panel" aria-label="Sound controls">
            <Knob
              label="Tempo"
              value={tempo}
              min={60}
              max={180}
              suffix=" BPM"
              onChange={setTempo}
            />
            <div className="control-divider" />
            <Knob
              label="Volume"
              value={volume}
              min={0}
              max={100}
              suffix="%"
              onChange={setVolume}
            />
            <div className="master-status">
              <SpeakerHigh weight="duotone" aria-hidden="true" />
              <span>Master</span>
            </div>
          </aside>

          <div className={`sequencer-panel mobile-page-${mobilePage}`}>
            <div className="panel-heading drum-heading">
              <div>
                <span className="eyebrow">Pattern 01</span>
                <h2>Drum sequencer</h2>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className="text-button page-button"
                  onClick={() => setMobilePage((page) => page === 0 ? 1 : 0)}
                >
                  {mobilePage === 0 ? 'Steps 1–8' : 'Steps 9–16'}
                </button>
                <button type="button" className="text-button" onClick={resetPattern}>Reset</button>
              </div>
            </div>

            <div className="step-ruler" aria-hidden="true">
              <span />
              {STEP_NUMBERS.map((step) => <span className={`step-half-${step < 8 ? 0 : 1}`} key={step}>{step + 1}</span>)}
            </div>

            <div className="drum-grid">
              {DRUM_VOICES.map((voice) => (
                <div className="drum-row" key={voice}>
                  <span className="voice-label">{VOICE_LABELS[voice]}</span>
                  <div className="steps">
                    {STEP_NUMBERS.map((step) => (
                      <button
                        type="button"
                        key={step}
                        className={`step-button step-half-${step < 8 ? 0 : 1} ${drums[voice][step] ? 'is-on' : ''} ${currentStep === step && isPlaying ? 'is-current' : ''}`}
                        aria-label={`${VOICE_LABELS[voice]}, step ${step + 1}`}
                        aria-pressed={drums[voice][step]}
                        onClick={() => setDrums((pattern) => toggleDrumStep(pattern, voice, step))}
                      ><span /></button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="piano-roll-header">
              <div>
                <span className="eyebrow">Live notes</span>
                <h2>Piano roll</h2>
              </div>
              <button
                type="button"
                className={`arm-button ${noteArmed ? 'is-armed' : ''}`}
                aria-pressed={noteArmed}
                onClick={() => setNoteArmed((value) => !value)}
              >
                <span className="arm-dot" />
                {noteArmed ? 'Armed' : 'Arm notes'}
              </button>
            </div>

            <div className="piano-roll" aria-label="Piano note sequencer">
              {PIANO_NOTES.map((note) => (
                <div className="note-row" key={note}>
                  <span className="note-label">{note}</span>
                  <div className="note-cells">
                    {STEP_NUMBERS.map((step) => {
                      const active = piano[step].includes(note)
                      return (
                        <button
                          type="button"
                          key={step}
                          className={`note-cell step-half-${step < 8 ? 0 : 1} ${active ? 'is-on' : ''} ${currentStep === step && isPlaying ? 'is-current' : ''}`}
                          aria-label={`${note}, step ${step + 1}`}
                          aria-pressed={active}
                          onClick={() => setPiano((pattern) => togglePianoStep(pattern, step, note))}
                        ><span /></button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="keyboard-panel">
          <div className="keyboard-caption">
            <span>Play with pointer or A–J keys</span>
            <span className={autoplayBlocked ? 'audio-waiting' : 'audio-ready'}>
              {autoplayBlocked ? 'Audio waiting' : 'Audio ready'}
            </span>
          </div>
          <Keyboard pressedNotes={pressedNotes} onAttack={attackNote} onRelease={releaseNote} />
        </div>
      </section>
    </main>
  )
}
