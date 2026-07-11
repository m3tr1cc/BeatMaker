# BeatMaker

BeatMaker is a Codefair-ready browser instrument with a 16-step drum sequencer, quantized piano roll, playable keyboard, reactive waveform, tempo and volume controls, and downloadable master-output recording.

## Run locally

```bash
npm install
npm run dev
```

The browser may block the initial demo audio until the first click, tap, or keypress. The visual playhead continues so visitors still receive an immediate interaction cue.

## Controls

- Toggle kick, snare, and closed-hat cells to change the drum loop.
- Click piano-roll cells to program notes, or arm live notes and play the keyboard while the transport runs.
- Play the piano with pointer input or the `A W S E D F T G Y H U J` computer keys.
- Use the circular transport controls to play, pause, and record.
- Stopping a recording downloads the complete master mix in the format supported by the browser.

## Quality gates

```bash
npm run lint
npm run check
npm run test
npm run build
```

The app is client-only and does not require environment variables, a backend, or Supabase migrations.
