# AGENTS.md

## Project identity

BeatMaker is a customer-facing Codefair project: a polished, full-frame browser instrument for programming drum patterns, playing and sequencing piano notes, and downloading live recordings. Treat this repository as production application code, not a disposable prototype or visual mockup.

## Core stack

Use this stack unless a task explicitly changes it:

- Vite
- React
- TypeScript
- Tone.js and the Web Audio API
- Canvas 2D for reactive visualization
- Plain CSS
- Vitest and Testing Library
- Vercel static deployment

Do not migrate to Next.js, add a backend, add auth, introduce a database, or add a heavy UI framework unless the task explicitly requires it. Use Phosphor Icons for standard UI icons and keep dependencies focused.

## Product and audio rules

This is a real musical instrument. Never ship fake audio, placeholder interactions, decorative controls that do nothing, unlicensed samples, or UI that implies unavailable behavior.

- Keep the first screen focused on the instrument and filling the Codefair frame.
- Use synth-generated drum and piano voices unless properly licensed samples are intentionally added and documented.
- Start or resume audio safely around browser autoplay restrictions.
- Prevent stuck notes on pointer cancel, key release, pause, blur, and teardown.
- Route recording through the same master output users hear.
- Keep mouse, touch, and computer-keyboard input working.
- Preserve keyboard labels, visible focus, semantic controls, and reduced-motion support.

## Supabase migrations

For every task, explicitly check whether the change requires a Supabase schema, RLS, seed, function, trigger, or policy migration. If one is required, create a real migration, push it to the linked Supabase project, verify the deployed schema and policies, and report migration status. Do not leave required changes as TODOs or manual dashboard work.

BeatMaker currently has no backend and requires no Supabase migration.

## Required checks

Before finishing every task, run:

```bash
npm run lint
npm run check
npm run test
npm run build
```

Also verify affected interactions in a real browser and check the console when the task changes user-facing behavior.

## Pull request handoff

After bootstrap, every task must end in a pull request. Once checks and task-specific verification pass, commit only the intended files, push the task branch, and open or update a PR. Do not consider work complete until the PR exists and its Vercel preview has been checked.
