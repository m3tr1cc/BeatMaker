import * as Tone from 'tone'
import type { DrumPattern, DrumVoice, PianoPattern } from './music'
import { STEP_COUNT, volumeToGain } from './music'

export interface SequenceSnapshot {
  drums: DrumPattern
  piano: PianoPattern
}

export type StepListener = (step: number) => void
export type SequenceProvider = () => SequenceSnapshot

export class AudioEngine {
  private readonly master: Tone.Gain
  private readonly recorder: Tone.Recorder
  private readonly waveform: Tone.Waveform
  private readonly kick: Tone.MembraneSynth
  private readonly snare: Tone.NoiseSynth
  private readonly hihat: Tone.MetalSynth
  private readonly piano: Tone.PolySynth<Tone.Synth>
  private repeatId: number | null = null
  private step = 0
  private provider: SequenceProvider | null = null
  private listener: StepListener | null = null
  private recording = false

  constructor() {
    this.master = new Tone.Gain(volumeToGain(72)).toDestination()
    this.recorder = new Tone.Recorder()
    this.waveform = new Tone.Waveform(512)
    this.master.connect(this.recorder)
    this.master.connect(this.waveform)

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.045,
      octaves: 7,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0.01, release: 0.3 },
    }).connect(this.master)

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.08 },
    }).connect(this.master)
    this.snare.volume.value = -8

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.055, release: 0.02 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4200,
      octaves: 1.2,
    }).connect(this.master)
    this.hihat.volume.value = -16

    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.008, decay: 0.16, sustain: 0.34, release: 0.72 },
    }).connect(this.master)
    this.piano.volume.value = -10
  }

  setSequenceProvider(provider: SequenceProvider): void {
    this.provider = provider
  }

  setStepListener(listener: StepListener): void {
    this.listener = listener
  }

  async unlock(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('Audio start timed out while waiting for a user gesture')),
        1_200,
      )
      Tone.start().then(
        () => {
          window.clearTimeout(timeout)
          resolve()
        },
        (error: unknown) => {
          window.clearTimeout(timeout)
          reject(error instanceof Error ? error : new Error('Audio could not start'))
        },
      )
    })
    if (Tone.getContext().state !== 'running') {
      throw new Error('Audio is waiting for a user gesture')
    }
  }

  async play(): Promise<void> {
    await this.unlock()
    const transport = Tone.getTransport()
    if (this.repeatId === null) {
      this.repeatId = transport.scheduleRepeat((time) => this.tick(time), '16n')
    }
    if (transport.state !== 'started') transport.start()
  }

  pause(): void {
    Tone.getTransport().pause()
    this.releaseAll()
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.rampTo(bpm, 0.08)
  }

  setVolume(volume: number): void {
    this.master.gain.rampTo(volumeToGain(volume), 0.04)
  }

  async attack(note: string): Promise<void> {
    await this.unlock()
    this.piano.triggerAttack(note, Tone.now(), 0.78)
  }

  release(note: string): void {
    this.piano.triggerRelease(note, Tone.now())
  }

  releaseAll(): void {
    this.piano.releaseAll(Tone.now())
  }

  getWaveform(): Float32Array {
    const values = this.waveform.getValue()
    return values instanceof Float32Array ? values : Float32Array.from(values)
  }

  canRecord(): boolean {
    return typeof MediaRecorder !== 'undefined'
  }

  async startRecording(): Promise<void> {
    await this.unlock()
    if (this.recording) return
    await this.recorder.start()
    this.recording = true
  }

  async stopRecording(): Promise<Blob> {
    if (!this.recording) throw new Error('No recording is active')
    const blob = await this.recorder.stop()
    this.recording = false
    return blob
  }

  dispose(): void {
    const transport = Tone.getTransport()
    if (this.repeatId !== null) transport.clear(this.repeatId)
    this.releaseAll()
    this.kick.dispose()
    this.snare.dispose()
    this.hihat.dispose()
    this.piano.dispose()
    this.waveform.dispose()
    this.recorder.dispose()
    this.master.dispose()
  }

  private tick(time: number): void {
    const snapshot = this.provider?.()
    if (snapshot) {
      for (const voice of ['kick', 'snare', 'hihat'] as DrumVoice[]) {
        if (snapshot.drums[voice][this.step]) this.triggerDrum(voice, time)
      }
      for (const note of snapshot.piano[this.step]) {
        this.piano.triggerAttackRelease(note, '16n', time, 0.64)
      }
    }

    const visibleStep = this.step
    Tone.getDraw().schedule(() => this.listener?.(visibleStep), time)
    this.step = (this.step + 1) % STEP_COUNT
  }

  private triggerDrum(voice: DrumVoice, time: number): void {
    if (voice === 'kick') this.kick.triggerAttackRelease('C1', '8n', time, 0.94)
    if (voice === 'snare') this.snare.triggerAttackRelease('16n', time, 0.72)
    if (voice === 'hihat') this.hihat.triggerAttackRelease('32n', time, 0.34)
  }
}
